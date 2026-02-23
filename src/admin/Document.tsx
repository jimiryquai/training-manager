import { Toaster } from '@/app/hooks/use-toast';

export const CoachDocument: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => (
    <html lang="en">
        <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Coach Admin - Training Manager</title>
            <link rel="modulepreload" href="/src/client.tsx" />
            <link rel="stylesheet" href="/src/app/styles/globals.css" />
        </head>
        <body className="bg-muted/40">
            {children}
            <Toaster />
            <script>import("/src/client.tsx")</script>
        </body>
    </html>
);
