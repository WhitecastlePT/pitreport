import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:noise_meter/noise_meter.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/report.dart';
import '../services/firestore_service.dart';
import '../services/storage_service.dart';
import '../theme.dart';

const List<String> kCategories = [
  'Pavimento danificado',
  'Iluminação pública',
  'Resíduos/Lixo',
  'Vandalismo',
  'Sinalização',
  'Espaços verdes',
  'Poluição Sonora',
  'Outro',
];

class _PhotoCapture {
  final File file;
  final double? latitude;
  final double? longitude;
  final double? heading;
  final String headingLabel;

  _PhotoCapture({
    required this.file,
    this.latitude,
    this.longitude,
    this.heading,
    this.headingLabel = '',
  });
}

class ReportFormScreen extends StatefulWidget {
  const ReportFormScreen({super.key});

  @override
  State<ReportFormScreen> createState() => _ReportFormScreenState();
}

class _ReportFormScreenState extends State<ReportFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _titleFocusNode = FocusNode();
  final _descriptionFocusNode = FocusNode();
  final _firestoreService = FirestoreService();
  final _storageService = StorageService();

  String _selectedCategory = kCategories[0];
  final List<_PhotoCapture> _captures = [];
  double? _latitude;
  double? _longitude;
  String _address = '';
  double? _heading;
  String _headingLabel = '';
  bool _locating = false;
  bool _submitting = false;
  StreamSubscription<CompassEvent>? _compassSub;

  // Poluição Sonora
  final NoiseMeter _noiseMeter = NoiseMeter();
  StreamSubscription<NoiseReading>? _noiseSub;
  double? _decibelLevel;
  double? _maxDecibelLevel;
  bool _isRecording = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _getLocation());
    if (FlutterCompass.events != null) {
      _compassSub = FlutterCompass.events!.listen((event) {
        if (mounted && event.heading != null) {
          setState(() {
            _heading = event.heading;
            _headingLabel = _degreesToLabel(event.heading!);
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _compassSub?.cancel();
    _noiseSub?.cancel();
    _titleController.dispose();
    _descriptionController.dispose();
    _titleFocusNode.dispose();
    _descriptionFocusNode.dispose();
    super.dispose();
  }

  Future<void> _startNoiseMeasure() async {
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Permissão do microfone negada.')),
        );
      }
      return;
    }
    setState(() {
      _decibelLevel = null;
      _maxDecibelLevel = null;
      _isRecording = true;
    });
    _noiseSub = _noiseMeter.noise.listen(
      (NoiseReading reading) {
        if (!mounted) return;
        setState(() {
          _decibelLevel = reading.meanDecibel;
          if (_maxDecibelLevel == null ||
              reading.maxDecibel > _maxDecibelLevel!) {
            _maxDecibelLevel = reading.maxDecibel;
          }
        });
      },
      onError: (_) => _stopNoiseMeasure(),
    );
  }

  void _stopNoiseMeasure() {
    _noiseSub?.cancel();
    _noiseSub = null;
    if (mounted) setState(() => _isRecording = false);
  }

  Color _decibelColor(double db) {
    if (db < 50) return Colors.greenAccent;
    if (db < 70) return Colors.yellowAccent;
    if (db < 85) return kOrange;
    return Colors.redAccent;
  }

  String _degreesToLabel(double degrees) {
    if (degrees < 0) degrees += 360;
    if (degrees >= 337.5 || degrees < 22.5) return 'Norte';
    if (degrees < 67.5) return 'Nordeste';
    if (degrees < 112.5) return 'Este';
    if (degrees < 157.5) return 'Sudeste';
    if (degrees < 202.5) return 'Sul';
    if (degrees < 247.5) return 'Sudoeste';
    if (degrees < 292.5) return 'Oeste';
    return 'Noroeste';
  }

  Future<void> _getLocation() async {
    setState(() => _locating = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() => _locating = false);
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      final place = placemarks.isNotEmpty ? placemarks.first : null;
      final address = place != null
          ? '${place.street ?? ''}, ${place.locality ?? ''}'
          : '${position.latitude.toStringAsFixed(5)}, ${position.longitude.toStringAsFixed(5)}';

      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _address = address;
        _locating = false;
      });
    } catch (_) {
      setState(() => _locating = false);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 75);
    if (picked == null) return;

    final file = File(picked.path);
    final detector = FaceDetector(
      options: FaceDetectorOptions(performanceMode: FaceDetectorMode.accurate),
    );
    try {
      final inputImage = InputImage.fromFile(file);
      final faces = await detector.processImage(inputImage);
      if (faces.isNotEmpty) {
        if (mounted) {
          showDialog(
            context: context,
            builder: (_) => AlertDialog(
              backgroundColor: const Color(0xFF1E2540),
              title: const Text('Rosto detetado',
                  style: TextStyle(color: Colors.white)),
              content: const Text(
                'A fotografia contém uma ou mais pessoas com o rosto visível. '
                'Por favor tira uma nova foto sem rostos identificáveis.',
                style: TextStyle(color: Colors.white70),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('OK', style: TextStyle(color: kOrange)),
                ),
              ],
            ),
          );
        }
        return;
      }
    } catch (_) {
      // Deteção de rostos falhou (ex: modelo não disponível) — aceita a foto na mesma
    } finally {
      detector.close();
    }
    setState(() => _captures.add(_PhotoCapture(
          file: file,
          latitude: _latitude,
          longitude: _longitude,
          heading: _heading,
          headingLabel: _headingLabel,
        )));
  }

  void _showImageOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: kNavyBlue,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Colors.white),
              title: const Text('Câmara', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.white),
              title: const Text('Galeria', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_captures.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Adiciona pelo menos uma fotografia.')),
      );
      return;
    }
    if (_latitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Aguarda a obtenção da localização.')),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final user = FirebaseAuth.instance.currentUser!;
      final imageUrls = await _storageService.uploadReportImages(
          _captures.map((c) => c.file).toList(), user.uid);
      final photoMetadata = List.generate(imageUrls.length, (i) => {
        'url': imageUrls[i],
        'latitude': _captures[i].latitude,
        'longitude': _captures[i].longitude,
        'heading': _captures[i].heading,
        'headingLabel': _captures[i].headingLabel,
      });

      final report = Report(
        id: '',
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        category: _selectedCategory,
        imageUrls: imageUrls,
        photoMetadata: photoMetadata,
        latitude: _latitude!,
        longitude: _longitude!,
        address: _address,
        status: 'pending',
        createdAt: DateTime.now(),
        userId: user.uid,
        heading: _heading,
        headingLabel: _headingLabel,
        decibelLevel: _selectedCategory == 'Poluição Sonora' ? _decibelLevel : null,
      );

      await _firestoreService.createReport(report);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Denúncia submetida com sucesso!')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao submeter: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    return Scaffold(
      backgroundColor: kNavyBlue,
      appBar: AppBar(
        backgroundColor: kNavyBlue,
        title: const Text('Nova Denúncia', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
              // Localização — primeiro campo
              _sectionLabel('Localização'),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.07),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white30),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Ícones fixos à esquerda
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.location_on, color: kOrange, size: 18),
                        SizedBox(height: 6),
                        Icon(Icons.explore, color: kOrange, size: 18),
                      ],
                    ),
                    const SizedBox(width: 8),
                    // Textos — sempre duas linhas, nunca crescem
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _locating
                                ? 'A obter localização...'
                                : _address.isEmpty
                                    ? 'Localização não disponível'
                                    : _address,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _locating
                                ? 'A ler bússola...'
                                : _headingLabel.isEmpty
                                    ? '–'
                                    : 'Orientação: $_headingLabel'
                                      '${_heading != null ? '  (${_heading!.toStringAsFixed(0)}°)' : ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white54, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Bússola em tempo real
                    Transform.rotate(
                      angle: (_heading ?? 0) * (pi / 180),
                      child: const Icon(Icons.navigation, color: kOrange, size: 28),
                    ),
                    const SizedBox(width: 4),
                    // Botão refresh / spinner
                    if (_locating)
                      const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: kOrange),
                      )
                    else
                      IconButton(
                        icon: const Icon(Icons.refresh, color: Colors.white54, size: 20),
                        onPressed: _getLocation,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Fotografias
              _sectionLabel('Fotografias *'),
              const SizedBox(height: 4),
              SizedBox(
                height: 110,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    GestureDetector(
                      onTap: _showImageOptions,
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.07),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white30),
                        ),
                        child: const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_a_photo_outlined,
                                color: Colors.white54, size: 30),
                            SizedBox(height: 4),
                            Text('Adicionar',
                                style: TextStyle(
                                    color: Colors.white54, fontSize: 11)),
                          ],
                        ),
                      ),
                    ),
                    ..._captures.asMap().entries.map((entry) {
                      final i = entry.key;
                      final img = entry.value.file;
                      return Stack(
                        children: [
                          Container(
                            margin: const EdgeInsets.only(right: 8),
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.white30),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.file(img, fit: BoxFit.cover),
                            ),
                          ),
                          Positioned(
                            top: 2,
                            right: 10,
                            child: GestureDetector(
                              onTap: () => setState(() => _captures.removeAt(i)),
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close,
                                    size: 14, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Categoria
              _sectionLabel('Categoria *'),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.07),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white54),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedCategory,
                    isExpanded: true,
                    dropdownColor: const Color(0xFF1E2540),
                    style: const TextStyle(color: Colors.white),
                    iconEnabledColor: Colors.white70,
                    items: kCategories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) {
                      if (v == null) return;
                      setState(() => _selectedCategory = v);
                      if (v == 'Poluição Sonora') {
                        _startNoiseMeasure();
                      } else {
                        _stopNoiseMeasure();
                      }
                    },
                  ),
                ),
              ),
              // Widget de Poluição Sonora — visível só quando essa categoria está selecionada
              if (_selectedCategory == 'Poluição Sonora') ...[
                const SizedBox(height: 12),
                _sectionLabel('Nível de Ruído'),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.07),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white30),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isRecording ? Icons.mic : Icons.mic_off,
                        color: _isRecording ? kOrange : Colors.white38,
                        size: 32,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _decibelLevel != null
                                  ? '${_decibelLevel!.toStringAsFixed(1)} dB'
                                  : '-- dB',
                              style: TextStyle(
                                color: _decibelLevel != null
                                    ? _decibelColor(_decibelLevel!)
                                    : Colors.white38,
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (_maxDecibelLevel != null)
                              Text(
                                'Pico: ${_maxDecibelLevel!.toStringAsFixed(1)} dB',
                                style: const TextStyle(
                                    color: Colors.white54, fontSize: 12),
                              ),
                            Text(
                              _isRecording ? 'A medir...' : 'Microfone inativo',
                              style: const TextStyle(
                                  color: Colors.white38, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      if (!_isRecording)
                        TextButton.icon(
                          onPressed: _startNoiseMeasure,
                          icon: const Icon(Icons.mic, color: kOrange, size: 18),
                          label: const Text('Medir',
                              style: TextStyle(color: kOrange)),
                        ),
                      if (_isRecording)
                        TextButton.icon(
                          onPressed: _stopNoiseMeasure,
                          icon: const Icon(Icons.stop, color: Colors.white54,
                              size: 18),
                          label: const Text('Parar',
                              style: TextStyle(color: Colors.white54)),
                        ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 12),

              // Título
              _sectionLabel('Título *'),
              const SizedBox(height: 4),
              TextFormField(
                controller: _titleController,
                focusNode: _titleFocusNode,
                keyboardType: TextInputType.text,
                textInputAction: TextInputAction.next,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDecoration('Ex: Buraco na estrada'),
                onTap: () => FocusScope.of(context).requestFocus(_titleFocusNode),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Campo obrigatório' : null,
              ),
              const SizedBox(height: 12),

              // Descrição
              _sectionLabel('Descrição'),
              const SizedBox(height: 4),
              TextFormField(
                controller: _descriptionController,
                focusNode: _descriptionFocusNode,
                keyboardType: TextInputType.multiline,
                textInputAction: TextInputAction.newline,
                style: const TextStyle(color: Colors.white),
                maxLines: 4,
                decoration: _inputDecoration('Descreve o problema com mais detalhe...'),
                onTap: () => FocusScope.of(context).requestFocus(_descriptionFocusNode),
              ),
              const SizedBox(height: 16),

            ],
                ),
              ),
            ),
          ),
          // Botão fixo no fundo
          Container(
            color: kNavyBlue,
            padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + bottomPadding),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: kOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Submeter Denúncia',
                        style: TextStyle(fontSize: 16)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: Colors.white70,
        fontSize: 13,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.5,
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Colors.white38),
      filled: true,
      fillColor: Colors.white.withOpacity(0.07),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.white30),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.white30),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.white),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.redAccent),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.redAccent),
      ),
      errorStyle: const TextStyle(color: Colors.redAccent),
    );
  }
}
