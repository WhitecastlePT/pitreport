import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  User? get currentUser => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  Future<User?> signIn(String email, String password) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      // Resetar tentativas após login bem-sucedido
      if (credential.user != null) {
        await _db.collection('users').doc(credential.user!.uid).update({
          'loginAttempts': 0,
          'blocked': false,
        });
      }

      return credential.user;
    } on FirebaseAuthException {
      rethrow;
    }
  }

  Future<User?> signUp(String name, String email, String password) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final user = credential.user;
    if (user != null) {
      await _db.collection('users').doc(user.uid).set({
        'id': user.uid,
        'name': name.trim(),
        'email': email.trim(),
        'createdAt': FieldValue.serverTimestamp(),
      });
    }
    return user;
  }

  Future<void> signOut() => _auth.signOut();
}
