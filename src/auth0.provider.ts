import axios, { AxiosResponse } from 'axios';

const url: string = 'https://ashwinachu.auth0.com/oauth/token';
const headers: object = { 'content-type': 'application/json' };
const body: object = { "client_id": "AfiRNGtjQgQ8UZBk3dywxu0OL7e6WuVh", "client_secret": "mHXYS2fuuhpzgcMHrfZKIppif6wmYBta3s92xsox7qkd8K5GjK3HhjjDeGH5UrHz", "audience": "realm-test", "grant_type": "client_credentials" };


export const getAccessToken = async (): Promise<string> => {
    const response: AxiosResponse = await axios.post(url, body, headers);
    return response?.data?.access_token;
}