import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';
import 'map_screen.dart';
import 'report_list_screen.dart';
import 'report_form_screen.dart';
import 'login_screen.dart';
import 'stats_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  Future<void> _logout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Terminar sessão'),
        content: const Text('Tens a certeza que queres sair?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Sair'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await context.read<AuthProvider>().signOut();
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kNavyBlue,
      appBar: AppBar(
        backgroundColor: kNavyBlue,
        elevation: 0,
        title: const PitReportLogo(),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white70),
            tooltip: 'Terminar sessão',
            onPressed: () => _logout(context),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'O que pretendes fazer?',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  _ActionCard(
                    icon: Icons.add_circle_outline,
                    label: 'Nova Denúncia',
                    color: kOrange,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                          builder: (_) => const ReportFormScreen()),
                    ),
                  ),
                  _ActionCard(
                    icon: Icons.map_outlined,
                    label: 'Ver Mapa',
                    color: Colors.greenAccent,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => Scaffold(
                        backgroundColor: kNavyBlue,
                        appBar: AppBar(
                          backgroundColor: kNavyBlue,
                          title: const Text('Mapa', style: TextStyle(color: Colors.white)),
                          iconTheme: const IconThemeData(color: Colors.white),
                        ),
                        body: const MapScreen(),
                      )),
                    ),
                  ),
                  _ActionCard(
                    icon: Icons.list_alt_outlined,
                    label: 'As minhas\nDenúncias',
                    color: Colors.lightBlueAccent,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                          builder: (_) => const ReportListScreen()),
                    ),
                  ),
                  _ActionCard(
                    icon: Icons.bar_chart_outlined,
                    label: 'Estatísticas',
                    color: Colors.purpleAccent,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const StatsScreen()),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.07),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.5), width: 1.5),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: color),
            const SizedBox(height: 12),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
