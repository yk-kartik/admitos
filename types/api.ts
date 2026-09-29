export type ApiDataSource = "DATABASE" | "MOCK";

export type ApiSuccess<T> = {
  data: T;
  dataSource: ApiDataSource;
  resourceStatus?: "ready" | "empty";
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
