import { Toaster } from 'react-hot-toast';
import Header from "./components/Header"
import Main from "./components/Main"

export default function App() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 font-sans">
            <Toaster 
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#1e293b',
                        color: '#fff',
                        border: '1px solid #334155',
                    },
                }}
            />
            <Header />
            <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
                <Main />
            </div>
        </div>
    )
}