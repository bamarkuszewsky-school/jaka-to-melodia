import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

// Ta konfiguracja NIE jest tajna — każda strona z Firebase pokazuje ją publicznie.
// Przed obcymi chronią nas hasła ról (Firebase Auth) i reguły bazy (database.rules.json).
const firebaseConfig = {
  apiKey: 'AIzaSyCWlhIXJiC4GztaIUCMNs4-YMDQvCXBaaM',
  authDomain: 'jaka-to-melodia-fee75.firebaseapp.com',
  databaseURL: 'https://jaka-to-melodia-fee75-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'jaka-to-melodia-fee75',
  storageBucket: 'jaka-to-melodia-fee75.firebasestorage.app',
  messagingSenderId: '923489130417',
  appId: '1:923489130417:web:b8fa3e8d0599bd88798f90',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)
