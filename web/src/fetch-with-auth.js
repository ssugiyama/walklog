import firebase from 'firebase/app';

export default async function fetchWithAuth(url, params = null) {
    const user = firebase.auth().currentUser;
    let p;
    if (user) {
        const idToken = await user.getIdToken();
        if (params === null) p = {};
        const headers = p.headers || {};
        headers.Authorization = `Bearer ${idToken}`;
        p.headers = headers;
    }
    return fetch(url, p);
}
