import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
@Injectable()
export class FirebaseService {
  constructor() {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return admin.auth().verifyIdToken(token);
  }

  async createUser(email: string, password: string) {
    return admin.auth().createUser({ email, password });
  }
}
