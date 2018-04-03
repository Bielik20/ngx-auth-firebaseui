import {EventEmitter, Injectable} from '@angular/core';
import {MatSnackBar} from '@angular/material';
import {AngularFireAuth} from 'angularfire2/auth';
import {ISignInProcess} from '../index';
import {ISignUpProcess} from '../interfaces/main.interface';
import {FirestoreSyncService} from './firestore-sync.service';
import * as firebase from 'firebase/app';
import User = firebase.User;
import GoogleAuthProvider = firebase.auth.GoogleAuthProvider;
import FacebookAuthProvider = firebase.auth.FacebookAuthProvider;
import TwitterAuthProvider = firebase.auth.TwitterAuthProvider;
import GithubAuthProvider = firebase.auth.GithubAuthProvider;
import UserCredential = firebase.auth.UserCredential;

export enum AuthProvider {
    EmailAndPassword,
    Google,
    Facebook,
    Twitter,
    Github,
    PhoneNumber
}

@Injectable()
export class AuthProcessService implements ISignInProcess, ISignUpProcess {

    onSuccessEmitter: EventEmitter<any> = new EventEmitter<any>();
    onErrorEmitter: EventEmitter<any> = new EventEmitter<any>();
    emailConfirmationSent: boolean;

    constructor(public auth: AngularFireAuth,
                private _fireStoreService: FirestoreSyncService,
                private _snackBar: MatSnackBar) {
    }

    public resetPassword(email: string) {

        return this.auth.auth.sendPasswordResetEmail(email)
            .then(() => console.log('email sent'))
            .catch((error) => this.onErrorEmitter.next(error));
    }

    public async signInWith(provider: AuthProvider, email?: string, password?: string) {
        try {
            let signInResult: User | UserCredential;

            switch (provider) {
                case AuthProvider.EmailAndPassword:
                    signInResult = await this.auth.auth.signInWithEmailAndPassword(email, password) as User;
                    await this._fireStoreService.updateUserData(signInResult);
                    this._snackBar.open(`Hallo ${signInResult.displayName ? signInResult.displayName : ''}!`, 'OK', {duration: 5000});
                    return this.onSuccessEmitter.next(signInResult);
                case AuthProvider.Google:
                    signInResult = await this.auth.auth.signInWithPopup(new GoogleAuthProvider()) as UserCredential;
                    break;

                case AuthProvider.Facebook:
                    signInResult = await this.auth.auth.signInWithPopup(new FacebookAuthProvider()) as UserCredential;
                    break;

                case AuthProvider.Twitter:
                    signInResult = await this.auth.auth.signInWithPopup(new TwitterAuthProvider()) as UserCredential;
                    break;

                default:
                    throw new Error(`${AuthProvider[provider]} is not available as auth provider`);

            }

            await this._fireStoreService.updateUserData(signInResult.user);
            this._snackBar.open(`Hallo ${signInResult.user.displayName ? signInResult.user.displayName : ''}!`,
                'OK', {duration: 5000});
            this.onSuccessEmitter.next(signInResult.user);
        }
        catch (err) {
            console.error(err);
            this._snackBar.open(err.message, 'OK', {duration: 5000});
            this.onErrorEmitter.next(err);
        }
    }

    /**
     * Sign up new users via email and password.
     * After that the user should verify and confirm an email sent via the firebase
     */
    public async signUp(name: string, email: string, password: string) {
        try {
            console.log(`name: ${name} | email: ${email} --> ${password}`);
            const user: User = await this.auth.auth.createUserWithEmailAndPassword(email, password);
            const res = await this._fireStoreService
                .getUserDocRefByUID(user.uid)
                .set({
                    uid: user.uid,
                    displayName: name,
                    email: user.email,
                    photoURL: user.photoURL
                } as User);
            console.log('on sign up with user', user);
            console.log('on sign up with res', res);
            const sendEmailVerification = await user.sendEmailVerification();
            this.emailConfirmationSent = true;
            console.log('on sign up with sendEmailVerification', sendEmailVerification);
            this._snackBar.open(`Hallo ${name}!`, 'OK', {duration: 10000});
            this.onSuccessEmitter.next(user);
        }
        catch (err) {
            console.error(err);
            this._snackBar.open(err.message, 'OK', {duration: 5000});
            this.onErrorEmitter.next(err);
        }
    }

    public signInWithPhoneNumber() {
        // todo: 3.1.18
    }

}