import { createSlice } from '@reduxjs/toolkit';

const currentYear = (new Date()).getFullYear();
const years = [];
for (let y = currentYear; y >= 1997; y -= 1) {
    years.push(y);
}

const initialState = {
    years,
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
            if (action.payload) {
                const { uid, displayName, photoURL } = action.payload;
                state.currentUser = { uid, displayName, photoURL };
            } else {
                state.currentUser = null;
            }
        },
    },
});

export const { setUsers, setCurrentUser } = miscSlice.actions;
export default miscSlice.reducer;
