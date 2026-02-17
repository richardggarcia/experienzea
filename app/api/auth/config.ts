import { getServerSession } from "next-auth/next";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const adminEmail = process.env.ADMIN_EMAIL || "admin@experienzea.com";
                const adminPassword = process.env.ADMIN_PASSWORD;
                
                if (!adminPassword) {
                    console.error("❌ ADMIN_PASSWORD no está configurada");
                    return null;
                }
                
                if (
                    credentials?.email === adminEmail &&
                    credentials?.password === adminPassword
                ) {
                    return {
                        id: "1",
                        name: "ExperienZea Admin",
                        email: adminEmail,
                        role: "admin"
                    };
                }
                return null;
            }
        })
    ],
    pages: {
        signIn: "/company/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
            }
            return session;
        }
    },
    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60,
    }
};

export async function auth() {
    return await getServerSession(authOptions);
}
