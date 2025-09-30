import axios from 'axios';
 // PrestaShop Webservice Key
const API_BASE_URL = 'https://b2b.fumostore.com/api';
const API_KEY = 'ZK2XHVFPTQCP7ZUTS86K44W95HBVIEKU'; 
const api = axios.create({
  baseURL: API_BASE_URL,
  auth: {
    username: API_KEY,
    password: '',
  },
  headers: {
    'Output-Format': 'JSON',
  },
});

export const loginEmployee = async (email: string, password: string) => {
  // PrestaShop does not provide a default employee login endpoint via webservice.
  // Usually you'd authenticate via a custom endpoint on your PrestaShop store that returns a token for employees.
  // This is a placeholder to demonstrate the flow.
  return { success: true, employee_id: 1, token: 'demo-token' };
};

export const getClientsForAgent = async (agentId: number) => {
  // Example: fetch customers and filter by an 'id_assigned_agent' custom field in your PrestaShop DB.
  const res = await api.get('/customers?display=full');
  return res.data.customers || [];
};
export const getProducts = async () => {
  const res = await api.get('/products?output_format=JSON&display=full&limit=50');
  console.log('API products sample:', JSON.stringify(res.data.products[0], null, 2));
  return res.data.products || [];
};

export const getallCustomerss = async () => {
  try {
    const res = await api.get('/customers', {
      params: {
        output_format: 'JSON',
        display:'full', // safe fields
        limit: 50,
      },
    });
    console.log('Sample customer:', res.data.customers?.[0]);
    return res.data.customers || [];
  } catch (error: any) {
    console.error('❌ Customers API error:', error.response?.status, error.response?.data || error.message);
    return [];
  }
};

export const createOrder = async (orderPayload: any) => {
  const res = await api.post('/orders', orderPayload);
  return res.data;
};
export const getOrdersFromServer = async () => {
  try {
    const res = await api.get('/orders?output_format=JSON&display=full&limit=50');
    console.log('Server orders:', res.data.orders);
    return res.data.orders || [];
  } catch (err) {
    console.log('Orders API error:', err);
    return [];
  }
};
export const getSafeOrders = async (limit = 50) => {
  try {
    const res = await api.get('/orders', {
      params: {
        output_format: 'JSON',
        display: '[id,id_customer,total_paid,date_add,current_state]',
        limit,
      },
    });
    console.log('getSafeOrders success:', res.data.orders?.length);
    return res.data.orders || [];
  } catch (err: any) {
    console.error('getSafeOrders error:', err.response?.status, err.response?.data || err.message);
    if (err.response?.data?.errors) console.error('server errors:', err.response.data.errors);
    return [];
  }
};