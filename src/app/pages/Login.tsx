import { useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Lock, Mail, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("gerente@flamboyant.com.br");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.toLowerCase().includes("inválid") || msg.toLowerCase().includes("credenci")) {
        setError("E-mail ou senha inválidos.");
      } else {
        setError("Erro ao conectar com o servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B1A1A] to-[#a43030] shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform duration-300 overflow-hidden">
            <img src="/src/assets/flamboyant-logo.png" alt="Flamboyant" className="w-12 h-12 object-contain brightness-0 invert" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Flamboyant Shopping
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Gestão Integrada de Ocorrências e Sinistros
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border-t-4 border-[#8B1A1A]">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-6 flex items-start">
            <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-yellow-600" />
            <div className="text-sm font-medium">
              Acesso restrito. Este sistema destina-se apenas a gerentes e administradores autorizados do Flamboyant Shopping.
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-mail ou Usuário
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#8B1A1A] focus:border-[#8B1A1A] sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#8B1A1A] focus:border-[#8B1A1A] sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#8B1A1A] focus:ring-[#8B1A1A] border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                  Lembrar acesso
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-[#8B1A1A] hover:text-[#a43030] transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1A1A] hover:bg-[#a43030] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1A1A] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Entrando..." : "Entrar no Sistema"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
