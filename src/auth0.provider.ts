import axios, { AxiosResponse } from 'axios';

const url: string = 'https://ashwinachu.auth0.com/oauth/token';
const headers: object = { 'content-type': 'application/json' };
const body: object = { "client_id": "HTgTANKHZ7dg9hOjYog3Xyim9jVr9KQL", "client_secret": "xYKKlc6hSndbDu83FWjnHdtw6gcV7mnPM2lweUui1xTOqVjU6qrGYpGuVo8HZ1yc", "audience": "realm-test", "grant_type": "client_credentials" };


export const getAccessToken = async (): Promise<string> => {
    const response: AxiosResponse = await axios.post(url, body, headers);
    return response?.data?.access_token;
}