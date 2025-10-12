import axios from 'axios';
// PrestaShop Webservice Key
const API_BASE_URL = 'https://b2b.fumostore.com/api';
const API_LOGIN_URL = 'https://b2b.fumostore.com/module';
export const API_KEY = 'ZK2XHVFPTQCP7ZUTS86K44W95HBVIEKU';

function generateRandomNumber(length: number): number {
  if (length < 1) {
    throw new Error("Length must be at least 1");
  }

  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

  try {
    let int_random = generateRandomNumber(10);
    const res = await api.post(`/employeeapi/auth?t=${int_random}`, { email, password }, {
      baseURL: API_LOGIN_URL, // Override baseURL to empty string to use the full loginUrl
    });
    return { success: true, token: res.data?.token, employee: res.data?.employee, expire: res.data?.expires_in };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.error };
  }

};

export const getClientsForAgent = async (agentId: number) => {
  // Example: fetch customers and filter by an 'id_assigned_agent' custom field in your PrestaShop DB.
  //  const res = await api.get('/customers?display=full');
  const res = await api.post(`/employeeapi/agentscustomer?t=${generateRandomNumber(10)}`,
    { employee_id: agentId },
    { baseURL: API_LOGIN_URL }
  );

  return res.data.customers || [];
};

export const getProducts = async () => {
  const res = await api.get('/products?output_format=JSON&display=full&limit=50');
  //console.log('API products sample:', JSON.stringify(res.data.products[0], null, 2));
  return res.data.products || [];
};

export const getActiveCategories = async () => {
  try {
    const res = await api.get(`/categories?display=[id,name]&filter[active]=1&output_format=JSON&ws_key=${API_KEY}`);
    return res.data;
  } catch (error: any) {
    console.log("Categories api error", error);
    return { success: false, error: error.response?.data?.error };
  }

}

export const getallCustomerss = async () => {
  try {
    const res = await api.get('/customers', {
      params: {
        output_format: 'JSON',
        display: 'full', // safe fields
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
export const getOrdersFromServer = async (employeeId: any) => {
  try {
    const res = await api.post(`/employeeapi/orders?output_format=JSON&display=full&limit=50&t=${generateRandomNumber(10)}`,
      { employee_id: employeeId },
      {
        baseURL: API_LOGIN_URL
      });
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

export const getCustomer = async (search: string | number) => {
  try {
    let url = `/customers/?display=full&output_format=JSON&ws_key=${API_KEY}`;

    // if search is numeric -> search by ID
    if (!isNaN(Number(search))) {
      url += `&filter[id]=[${search}]`;
    } else if (typeof search === 'string' && search.trim() !== '') {
      const nameParts = search.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts[1] || '';

      // Wildcard match both firstname and lastname
      if (lastName) {
        url += `&filter[firstname]=%[${encodeURIComponent(firstName)}]%&filter[lastname]=%[${encodeURIComponent(lastName)}]%`;
      } else {
        url += `&filter[firstname]=%[${encodeURIComponent(firstName)}]%`;
      }
    }

    const res = await api.get(url);
    // console.log('Customer res', res, url);

    return { success: true, data: res.data };

  } catch (error: any) {
    console.log('Customer error', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

export const getProductSearchResult = async (search: string) => {
  try {
    const res = await api.get(
      `/products?filter[name]=%[${encodeURIComponent(search)}]%&display=[id,name,id_default_image,price,minimal_quantity]&output_format=JSON&ws_key=${API_KEY}`
    );
    // console.log('Product search result', res);
    return { success: true, data: res.data };
  } catch (error: any) {
    console.log('Product search error', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

export const checkProductStock = async (product_id: string | number) => {
  try {
    const res = await api.get(`/stock_availables/?filter[id_product]=[${product_id}]&display=[id,id_product,id_product_attribute,quantity,depends_on_stock,out_of_stock]&output_format=JSON&ws_key=${API_KEY}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    console.log('Product stock error', error);
    return { success: false, error: error.response?.data?.error || error.message };

  }
}

export const clientAddressGet = async (client_id: string | number | null) => {
  try {
    const res = await api.get(`/addresses/?filter[id_customer]=[${client_id}]&display=full&output_format=JSON&ws_key=${API_KEY}`);
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}