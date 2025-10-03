import { environment } from '../../environments/environment.development';

const webServiceEndPointURL = environment.webServiceEndPointURL;

export const API_KEY = webServiceEndPointURL + '/api_key';
export const ASYNCAPI = webServiceEndPointURL + '/asyncapi.json';
export const LOGIN = webServiceEndPointURL + '/login';
export const LOGIN_API_KEY = webServiceEndPointURL + '/login/api_key';
export const LOGOUT = webServiceEndPointURL + '/logout';
export const MESSAGE_LOG = webServiceEndPointURL + '/message_log';
export const SLAM = webServiceEndPointURL + '/slam';
export const SYSTEM_INFO = webServiceEndPointURL + '/system/info';
export const WS_TOKEN = webServiceEndPointURL + '/ws_token';
