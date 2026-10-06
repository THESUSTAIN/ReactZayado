import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const getOffers = (category) =>
    axios
        .get(`${API}/offers`, {
            params: category ? { category } : {},
        })
        .then((r) => r.data);

export const getOffer = (id) =>
    axios.get(`${API}/offers/${id}`).then((r) => r.data);

export const createAppointment = (payload) =>
    axios.post(`${API}/appointments`, payload).then((r) => r.data);
