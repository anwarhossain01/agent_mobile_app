import axios from 'axios';
import base64 from 'react-native-base64'

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

export const createNewAddress = async (
  customer_id: string | number | null,
  alias: string,
  firstname: string,
  lastname: string,
  company: string,
  address1: string,
  postcode: string,
  city: string,
  id_country: number,
  phone_mobile: string | null,
  dni: number | null
) => {
  try {
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
    <prestashop>
      <address>
        <id_customer>${customer_id}</id_customer>
        <alias><![CDATA[${alias}]]></alias>
        <firstname><![CDATA[${firstname}]]></firstname>
        <lastname><![CDATA[${lastname}]]></lastname>
        <company><![CDATA[${company}]]></company>
        <address1><![CDATA[${address1}]]></address1>
        <postcode><![CDATA[${postcode}]]></postcode>
        <city><![CDATA[${city}]]></city>
        <id_country>${id_country}</id_country>
        <phone_mobile><![CDATA[${phone_mobile || ''}]]></phone_mobile>
        <dni><![CDATA[${dni || ''}]]></dni>
      </address>
    </prestashop>`;

    const headers = {
      'Authorization': `Basic ${API_KEY}`,
      'Content-Type': 'application/xml',
      'Accept': 'application/json'
    };

    console.log('createNewAddress xmlData', xmlData);

    const res = await api.post("/addresses", xmlData, {
      headers: headers
    });

    console.log('createNewAddress res', res);
    return { success: true, data: res.data };

  } catch (error: any) {
    console.log('createNewAddress error', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

export const getCountryList = async (country_name: string | null) => {
  try {
    const res = await api.get(`/countries?filter[name]=%[${country_name}]%&display=[id,name]&output_format=JSON&ws_key=${API_KEY}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    console.log('Country list error', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

export const getCartListForClient = async (id_customer: string | number) => {
  try {
    // gets all the carts that client has, this returns the ids of the carts
    /*
      {
  "carts": [
    {
      "id": 2086
    },
    {
      "id": 2098
    },
  ]
}
    */
    const res = await api.get(`/carts?filter[id_customer]=[${id_customer}]&&output_format=JSON&ws_key=${API_KEY}`);
    return { success: true, data: res.data };
  } catch (error) {
    console.log('Cart list error', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

export const getCartDetails = async (id_cart: string | number) => {
  // gets cart details
  /*
    {
  "cart": {
    "id": 2098,
    "id_address_delivery": 17085,
    "id_address_invoice": 17085,
    "id_currency": 1,
    "id_customer": 17078,
    "id_lang": 3,
    "id_shop_group": 1,
    "id_shop": 1,
    "delivery_option": "{\"17085\":\"0,\"}",
    "secure_key": "00c464e345ea1b20e1c2698c3b20fdc2",
    "date_add": "2025-10-08 01:16:07",
    "date_upd": "2025-10-15 10:42:17",
    "associations": {
      "cart_rows": [
        {
          "id_product": 349,
          "id_product_attribute": 0,
          "id_address_delivery": 17085,
          "id_customization": 0,
          "quantity": 1
        }
      ]
    }
  }
}
  */
  try {
    const res = await api.get(`/carts/${id_cart}?output_format=JSON&ws_key=${API_KEY}`);
    return { success: true, data: res.data };
  } catch (error) {
    console.log('Cart details error', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

export const getOrdersFiltered = async (
  id_customer: string | number | null,
  id_cart: string | number | null,
) => {
  try {
    // order by filter
    /* 
      {
  "orders": [
    {
      "id": 1544
    }
  ]
}
    */
    let filters = [];
    if (id_customer) filters.push(`filter[id_customer]=[${id_customer}]`);
    if (id_cart) filters.push(`filter[id_cart]=[${id_cart}]`);

    const queryString = filters.length > 0 ? `?${filters.join('&')}&` : '?';
    const res = await api.get(`/orders${queryString}output_format=JSON&ws_key=${API_KEY}`);
    return { success: true, data: res.data };
  } catch (error) {
    console.log("Orders error", error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

export const getCouriers= async (id : string | number | null) => {
  try {
    let filters = [];
    if (id) filters.push(`filter[id]=[${id}]`);
    filters.push(`filter[active]=[1]`);
    filters.push(`display=[id,name,active,is_free,delay]`);
    const queryString = filters.length > 0 ? `?${filters.join('&')}&` : '?';
    const res = await api.get(`/carriers${queryString}output_format=JSON&ws_key=${API_KEY}`);
   // const res = await api.get(`/carriers?display=[id,name,active,is_free,delay]&filter[active]=[1]&filter[id]=[${id}]&output_format=JSON&ws_key=${API_KEY}`);
    return { success: true, data: res.data };
  } catch (error) {
    console.log("Orders error", error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

export const getDeliveries = async (id_carrier : string | number | null) => {
  try {
    const res = await api.get(`/deliveries?display=[id,id_carrier,id_zone,price]&filter[id_carrier]=[${id_carrier}]&ws_key=${API_KEY}&output_format=JSON`);
    return { success: true, data: res.data };
  } catch (error) {
    console.log("Orders error", error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}