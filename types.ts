
export enum UserType {
  ADMIN = 'Admin',
  NORMAL = 'Normal'
}

export interface User {
  User_ID: number;
  User_Name: string;
  Password?: string;
  User_Type: UserType;
}

export interface Department {
  Department_ID: number;
  Department_Name: string;
}

export interface Office {
  Office_ID: number;
  Office_Name: string;
  Block: string;
  AC_No: number;
  Department_ID: number;
  User_ID: number;
}

export interface Bank {
  Bank_ID: number;
  Bank_Name: string;
}

export interface BankBranch {
  Branch_ID: number;
  Branch_Name: string;
  IFSC_Code: string;
  Bank_ID: number;
}

export interface Post {
  Post_ID: number;
  Post_Name: string;
  Category: string;
  Class: string;
}

export interface Payscale {
  Pay_ID: number;
  Pay_Name: string;
}

export enum ServiceType {
  REGULAR = 'नियमित',
  CONTRACT = 'संविदा',
  COLLECTOR_RATE = 'कलेक्टर दर',
  AD_HOC = 'तदर्थ',
  DAILY_WAGE = 'दैनिक वेतन भोगी',
  PLACEMENT = 'प्लेसमेंट निजी कंपनी/ ठेकेदार के कर्मी',
  RETIRED = 'सेवानिवृत्त'
}

export interface Employee {
  Employee_ID: number;
  Employee_Name: string;
  Employee_Surname: string;
  Gender: string;
  DOB: string;
  PwD: 'Yes' | 'No';
  Service_Type: ServiceType;
  Post_ID: number;
  Pay_ID: number;
  Department_ID: number;
  Office_ID: number;
  Mobile: string;
  EPIC: string;
  Bank_ID: number;
  Branch_ID: number;
  ACC_No: string;
  IFSC_Code: string;
}

export type AppData = {
  users: User[];
  departments: Department[];
  offices: Office[];
  banks: Bank[];
  branches: BankBranch[];
  posts: Post[];
  payscales: Payscale[];
  employees: Employee[];
  userPostSelections: Record<number, number[]>; // Maps User_ID to an array of Post_IDs
};
