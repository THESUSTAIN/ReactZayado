import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const getServices = () =>
    axios.get(`${API}/services`).then((r) => r.data);

export const getService = (slug) =>
    axios.get(`${API}/services/${slug}`).then((r) => r.data);

export const getProducts = () =>
    axios.get(`${API}/products`).then((r) => r.data);

export const createAppointment = (payload) =>
    axios.post(`${API}/appointments`, payload).then((r) => r.data);
