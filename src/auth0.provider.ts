import axios, { AxiosResponse } from 'axios';

const url: string = 'https://ashwinachu.auth0.com/oauth/token';
const headers: object = { 'content-type': 'application/json' };
const body: object = { "client_id": "RwZlSso8t5UCRMIC4ufjnYWFt86Ru7UU", "client_secret": "kbrrIBtzD04w6MPZXwsS2MxqKhI2c28M76DBCAo2ptwHyzekxShRasQnaJyLo2mJ", "audience": "realm-test", "grant_type": "client_credentials" };


export const getAccessToken = async (): Promise<string> => {
       const response: AxiosResponse = await axios.post(url, body, headers);
       return response?.data?.access_token;
}