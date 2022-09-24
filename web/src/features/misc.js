import { createSlice } from '@reduxjs/toolkit';

const currentYear = (new Date()).getFullYear();
const years = [];
for (let y = currentYear; y >= 1997; y--) {
    years.push(y);
}

const initialState = {
    years: years,
    users: [],
    currentUser: null,
};

export const miscSlice = createSlice({
    name: 'misc',
    initialState,
    reducers: {
        setUsers: (state, action) => {
            state.users = action.payload;
        },
        setCurrentUser: (state, action) => {
            const { uid, displayName, photoURL } = action.payload;
            state.currentUser = { uid, displayName, photoURL };
        },
    },
});

export const { setUsers, setCurrentUser } = miscSlice.actions;
export default miscSlice.reducer;