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
                if (
                    credentials?.email === "admin@experienzea.com" &&
                    credentials?.password === "17515429"
                ) {
                    return {
                        id: "1",
                        name: "ExperienZea Admin",
                        email: "admin@experienzea.com",
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
