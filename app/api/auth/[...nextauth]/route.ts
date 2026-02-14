import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // Admin hardcodeado para MVP
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
        maxAge: 8 * 60 * 60, // 8 horas
    }
});

export { handler as GET, handler as POST };
