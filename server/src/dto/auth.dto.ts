export interface SignUpDTO {
    fullName: string;
    email: string;
    password: string;
    role: "User" | "Node" | "Admin";
}

export interface LoginDTO {
    email: string;
    password: string;
}
