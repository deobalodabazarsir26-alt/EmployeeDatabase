
import { AppData, UserType, ServiceType } from './types';

// Replace this URL with your deployed Google Apps Script Web App URL
export const GSHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxJ1W8GZ228VtWmMZc9u0nN_okgc4STocTE5H-TImvDyH6yhxEHyZFjTFNmktgQzEae/exec'; 

export const INITIAL_DATA: AppData = {
  users: [
    { User_ID: 1, User_Name: 'admin', Password: '123', User_Type: UserType.ADMIN },
    { User_ID: 2, User_Name: 'user1', Password: '123', User_Type: UserType.NORMAL },
  ],
  departments: [
    { Department_ID: 1, Department_Name: 'Education', Department_Type: 'State Govt' },
    { Department_ID: 2, Department_Name: 'Health', Department_Type: 'State Govt' },
    { Department_ID: 3, Department_Name: 'Public Works', Department_Type: 'Autonomous' },
  ],
  offices: [
    { Office_ID: 1, Office_Name: 'High School A', Block: 'Central', AC_No: 101, Department_ID: 1, User_ID: 1 },
    { Office_ID: 2, Office_Name: 'Govt Hospital B', Block: 'East', AC_No: 102, Department_ID: 2, User_ID: 2 },
  ],
  banks: [
    { Bank_ID: 1, Bank_Name: 'State Bank of India' },
    { Bank_ID: 2, Bank_Name: 'HDFC Bank' },
  ],
  branches: [
    { Branch_ID: 1, Branch_Name: 'Main Branch', IFSC_Code: 'SBIN0001', Bank_ID: 1 },
    { Branch_ID: 2, Branch_Name: 'City Square', IFSC_Code: 'HDFC0002', Bank_ID: 2 },
  ],
  posts: [
    { Post_ID: 1, Post_Name: 'Teacher', Category: 'Gen', Class: 'I' },
    { Post_ID: 2, Post_Name: 'Doctor', Category: 'Gen', Class: 'I' },
    { Post_ID: 3, Post_Name: 'Clerk', Category: 'OBC', Class: 'III' },
    { Post_ID: 4, Post_Name: 'Principal', Category: 'Gen', Class: 'I' },
    { Post_ID: 5, Post_Name: 'Nurse', Category: 'Gen', Class: 'II' },
  ],
  payscales: [
    { Pay_ID: 1, Pay_Name: 'Level 10 (56100-177500)' },
    { Pay_ID: 2, Pay_Name: 'Level 7 (44900-142400)' },
  ],
  employees: [],
  userPostSelections: {}
};
