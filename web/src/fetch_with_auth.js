import firebase from 'firebase/app';

export default async function fetchWithAuth(url, params = null) {
    const user = firebase.auth().currentUser;
    if (user) {
        const idToken = await user.getIdToken();
        if (params === null) params = {};
        const headers = params.headers || {};
        headers['Authorization'] = 'Bearer ' + idToken;
        params.headers = headers;
    }
    return await fetch(url, params);
}
