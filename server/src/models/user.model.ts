import mongoose from "mongoose";

export interface IUser {
    _id: any;

    fullName:string;
    email:string;
    password:string;
    role:"User" | "Node" | "Admin";
    resetToken:string;
    resetTokenExpiry:string;


}

const userSchema = new mongoose.Schema<IUser>({

    fullName:{
        type:String,
        trim:true,
        required:[true,"fullname field is missing"]
    },
    email:{
        type:String,
        unique:true,
        trim:true,
        required:[true,"email field is missing"]
    },
    password:{
       type:String,
       required:[true,"password filed is missing"],
    },
    role:{
        type:String,
        enum:["User","Node","Admin"],
        default:"User",

    },
    resetToken:{
        type:String,
    },
    resetTokenExpiry:{
        type:String,
    }


},{timestamps:true});

export const User = mongoose.model<IUser>("User",userSchema);
