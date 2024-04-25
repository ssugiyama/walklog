import firebase from 'firebase/app';

export default async function fetchWithAuth(url, params = null) {
    const user = firebase.auth().currentUser;
    const p = (params === null) ? {} : params;
    if (user) {
        const idToken = await user.getIdToken();
        p.headers ??= {};
        p.headers.Authorization = `Bearer ${idToken}`;
    }
    return fetch(url, p);
}
