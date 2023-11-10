export class ReturnMessage {
  private httpStatusCode: number;
  private s3HttpStatusCode: number;
  private data: any;
  private message: string;
  private s3Message: string;

  constructor(
    httpStatusCode?: number,
    data?: any,
    message?: string,
    s3HttpStatusCode?: number,
    s3Message?: string
  ) {
    this.httpStatusCode = httpStatusCode || 0;
    this.data = data || '';
    this.message = message || '';
    this.s3HttpStatusCode = s3HttpStatusCode || 0;
    this.s3Message = s3Message || '';
  }

  setHttpStatusCode(httpStatusCode) {
    this.httpStatusCode = httpStatusCode;
  }

  appendData(data) {
    this.data.append(data);
  }

  setMessage(message) {
    this.message = message;
  }

  setS3Message(s3Message) {
    this.s3Message = s3Message;
  }

  setS3HttpStatusCode(s3HttpStatusCode) {
    this.s3HttpStatusCode = s3HttpStatusCode;
  }

  toJSONWithImage(): string {
    return JSON.stringify({
      httpStatusCode: this.httpStatusCode,
      s3HttpStatusCode: this.s3HttpStatusCode,
      message: this.message,
      s3Message: this.s3Message,
      data: this.data,
    });
  }

  toJSON(): string {
    return JSON.stringify({
      httpStatusCode: this.httpStatusCode,
      message: this.message,
      data: this.data,
    });
  }
}
