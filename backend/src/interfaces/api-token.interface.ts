export interface IApiTokenService {
  getToken(): Promise<string>;
}
