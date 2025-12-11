export interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors: any;
}