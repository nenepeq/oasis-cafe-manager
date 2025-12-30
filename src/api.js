import axios from 'axios';

// Dirección de tu servidor Node que ya configuramos
const API_URL = 'http://localhost:3000';

export const getProducts = () => axios.get(`${API_URL}/products`);
export const registerSale = (saleData) => axios.post(`${API_URL}/sales`, saleData);
