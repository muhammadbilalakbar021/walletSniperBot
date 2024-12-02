export class Account {
  constructor(
    public id: number,
    public name: string,
    public email: string,
    public password: string,
    public country: string,
    public dob: string,
    public ip: string,
    public isBlacklisted: boolean,
  ) {}
}
