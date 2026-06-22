import { useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, TrendingUp } from 'lucide-react';
import logoFlamboyant from 'figma:asset/b02a990bf2c2da1561fd2f42223c5d2ce71ec09a.png';
import img2 from 'figma:asset/d529125559904c2ba18f90969ebcb78021da0611.png';

type Gravidade = 'alta' | 'media' | 'baixa';

interface Sinistro {
  tipo: string;
  gravidade: Gravidade;
  dataResolucao: string;
  valorIndenizacao: number;
  franquia: number;
  loja: string;
  regulador: string;
  dataCriacao: string;
}

export function SinistroForm() {
  const [sinistro, setSinistro] = useState<Sinistro>({
    tipo: '',
    gravidade: 'media',
    dataResolucao: '',
    valorIndenizacao: 0,
    franquia: 0,
    loja: '',
    regulador: '',
    dataCriacao: '',
  });
  
  const [sinistros, setSinistros] = useState<Sinistro[]>([]);
  const [mostrarSucesso, setMostrarSucesso] = useState(false);
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false);
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const reguladores = [
    'João Silva',
    'Maria Santos',
    'Pedro Oliveira',
    'Ana Costa',
    'Carlos Ferreira',
  ];

  const lojas = [
    'Loja Centro',
    'Loja Norte',
    'Loja Sul',
    'Loja Leste',
    'Loja Oeste',
  ];

  const gravidadeConfig = {
    alta: {
      label: 'Alta',
      color: 'bg-red-600',
      borderColor: 'border-red-600',
      textColor: 'text-red-700',
      bgLight: 'bg-red-50',
    },
    media: {
      label: 'Média',
      color: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-700',
      bgLight: 'bg-yellow-50',
    },
    baixa: {
      label: 'Baixa',
      color: 'bg-green-600',
      borderColor: 'border-green-600',
      textColor: 'text-green-700',
      bgLight: 'bg-green-50',
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sinistro.tipo && sinistro.dataResolucao && sinistro.loja && sinistro.regulador) {
      const novoSinistro = {
        ...sinistro,
        dataCriacao: new Date().toISOString().split('T')[0],
      };
      setSinistros([...sinistros, novoSinistro]);
      setSinistro({ 
        tipo: '', 
        gravidade: 'media', 
        dataResolucao: '',
        valorIndenizacao: 0,
        franquia: 0,
        loja: '',
        regulador: '',
        dataCriacao: '',
      });
      setMostrarSucesso(true);
      setTimeout(() => setMostrarSucesso(false), 3000);
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const calcularValorLiquido = (valorIndenizacao: number, franquia: number) => {
    return Math.max(0, valorIndenizacao - franquia);
  };

  const filtrarSinistros = () => {
    return sinistros.filter(s => {
      const matchLoja = !filtroLoja || s.loja === filtroLoja;
      const matchDataInicio = !filtroDataInicio || s.dataCriacao >= filtroDataInicio;
      const matchDataFim = !filtroDataFim || s.dataCriacao <= filtroDataFim;
      return matchLoja && matchDataInicio && matchDataFim;
    });
  };

  const sinistrosFiltrados = filtrarSinistros();

  const calcularEstatisticas = () => {
    const filtrados = sinistrosFiltrados;
    const totalIndenizacao = filtrados.reduce((acc, s) => acc + s.valorIndenizacao, 0);
    const totalFranquia = filtrados.reduce((acc, s) => acc + s.franquia, 0);
    const totalLiquido = filtrados.reduce((acc, s) => acc + calcularValorLiquido(s.valorIndenizacao, s.franquia), 0);
    
    return {
      total: filtrados.length,
      totalIndenizacao,
      totalFranquia,
      totalLiquido,
    };
  };

  const stats = calcularEstatisticas();

  return (
    <div className="w-full max-w-7xl mx-auto p-6 relative">
      {/* Decorative Images */}
      <div className="absolute -top-10 -left-10 w-48 h-48 opacity-20 pointer-events-none hidden lg:block">
        <img src={img2} alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute -bottom-10 -right-10 w-56 h-56 opacity-15 pointer-events-none hidden lg:block">
        <img src={img2} alt="" className="w-full h-full object-contain" />
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 relative z-10 border-t-4 border-[#8B1A1A]">
        {/* Logo Flamboyant */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#8B1A1A] rounded-full flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#8B1A1A]">Registro de Sinistros</h1>
          </div>
          <div className="w-40 h-16">
            <img src={logoFlamboyant} alt="Flamboyant" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#C8A882]/30">
          <button
            onClick={() => setMostrarRelatorio(false)}
            className={`px-6 py-3 font-medium transition-colors ${
              !mostrarRelatorio
                ? 'text-[#8B1A1A] border-b-2 border-[#8B1A1A]'
                : 'text-gray-500 hover:text-[#8B1A1A]'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Registrar Sinistro
            </div>
          </button>
          <button
            onClick={() => setMostrarRelatorio(true)}
            className={`px-6 py-3 font-medium transition-colors ${
              mostrarRelatorio
                ? 'text-[#8B1A1A] border-b-2 border-[#8B1A1A]'
                : 'text-gray-500 hover:text-[#8B1A1A]'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Relatórios
            </div>
          </button>
        </div>

        {!mostrarRelatorio ? (
          <>
            {mostrarSucesso && (
              <div className="mb-6 p-4 bg-[#C8A882]/20 border border-[#C8A882] rounded-lg flex items-center gap-3 animate-in fade-in duration-300">
                <CheckCircle2 className="w-5 h-5 text-[#8B7355]" />
                <p className="text-[#8B7355]">Sinistro registrado com sucesso!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo de Sinistro */}
                <div>
                  <label htmlFor="tipo" className="block text-sm font-medium text-[#8B1A1A] mb-2">
                    Tipo de Sinistro *
                  </label>
                  <input
                    type="text"
                    id="tipo"
                    value={sinistro.tipo}
                    onChange={(e) => setSinistro({ ...sinistro, tipo: e.target.value })}
                    placeholder="Ex: Colisão, Roubo, Incêndio..."
                    className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none transition"
                    required
                  />
                </div>

                {/* Loja */}
                <div>
                  <label htmlFor="loja" className="block text-sm font-medium text-[#8B1A1A] mb-2">
                    Loja *
                  </label>
                  <select
                    id="loja"
                    value={sinistro.loja}
                    onChange={(e) => setSinistro({ ...sinistro, loja: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none transition"
                    required
                  >
                    <option value="">Selecione uma loja</option>
                    {lojas.map((loja) => (
                      <option key={loja} value={loja}>
                        {loja}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor da Indenização */}
                <div>
                  <label htmlFor="valorIndenizacao" className="block text-sm font-medium text-[#8B1A1A] mb-2">
                    Valor da Indenização *
                  </label>
                  <input
                    type="number"
                    id="valorIndenizacao"
                    value={sinistro.valorIndenizacao || ''}
                    onChange={(e) => setSinistro({ ...sinistro, valorIndenizacao: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none transition"
                    required
                  />
                </div>

                {/* Franquia */}
                <div>
                  <label htmlFor="franquia" className="block text-sm font-medium text-[#8B1A1A] mb-2">
                    Franquia
                  </label>
                  <input
                    type="number"
                    id="franquia"
                    value={sinistro.franquia || ''}
                    onChange={(e) => setSinistro({ ...sinistro, franquia: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none transition"
                  />
                </div>

                {/* Valor Líquido (calculado) */}
                <div>
                  <label className="block text-sm font-medium text-[#8B1A1A] mb-2">
                    Valor Líquido (Indenização - Franquia)
                  </label>
                  <div className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg bg-gray-50 text-gray-700 font-semibold">
                    {formatarMoeda(calcularValorLiquido(sinistro.valorIndenizacao, sinistro.franquia))}
                  </div>
                </div>

                {/* Regulador */}
                <div>
                  <label htmlFor="regulador" className="block text-sm font-medium text-[#8B1A1A] mb-2">
                    Regulador *
                  </label>
                  <select
                    id="regulador"
                    value={sinistro.regulador}
                    onChange={(e) => setSinistro({ ...sinistro, regulador: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none transition"
                    required
                  >
                    <option value="">Selecione um regulador</option>
                    {reguladores.map((regulador) => (
                      <option key={regulador} value={regulador}>
                        {regulador}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gravidade */}
              <div>
                <label className="block text-sm font-medium text-[#8B1A1A] mb-3">
                  Gravidade *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(gravidadeConfig) as Gravidade[]).map((nivel) => {
                    const config = gravidadeConfig[nivel];
                    const isSelected = sinistro.gravidade === nivel;
                    
                    return (
                      <button
                        key={nivel}
                        type="button"
                        onClick={() => setSinistro({ ...sinistro, gravidade: nivel })}
                        className={`
                          p-4 rounded-lg border-2 transition-all duration-200
                          ${isSelected 
                            ? `${config.borderColor} ${config.bgLight} scale-105 shadow-md` 
                            : 'border-[#C8A882]/30 bg-white hover:border-[#C8A882]'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${config.color} shadow-sm`} />
                          <span className={`font-medium ${isSelected ? config.textColor : 'text-gray-600'}`}>
                            {config.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data de Resolução */}
              <div>
                <label htmlFor="dataResolucao" className="block text-sm font-medium text-[#8B1A1A] mb-2">
                  Data para Resolução *
                </label>
                <input
                  type="date"
                  id="dataResolucao"
                  value={sinistro.dataResolucao}
                  onChange={(e) => setSinistro({ ...sinistro, dataResolucao: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none transition"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#8B1A1A] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#6B1414] transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Registrar Sinistro
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Relatórios */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#8B1A1A]">Relatórios de Sinistros</h2>

              {/* Filtros */}
              <div className="bg-[#C8A882]/10 p-6 rounded-lg border border-[#C8A882]/30">
                <h3 className="text-lg font-semibold text-[#8B1A1A] mb-4">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="filtroLoja" className="block text-sm font-medium text-[#8B1A1A] mb-2">
                      Loja
                    </label>
                    <select
                      id="filtroLoja"
                      value={filtroLoja}
                      onChange={(e) => setFiltroLoja(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#C8A882]/40 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none transition"
                    >
                      <option value="">Todas as lojas</option>
                      {lojas.map((loja) => (
                        <option key={loja} value={loja}>
                          {loja}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="filtroDataInicio" className="block text-sm font-medium text-[#8B1A1A] mb-2">
                      Data Início
                    </label>
                    <input
                      type="date"
                      id="filtroDataInicio"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#C8A882]/40 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="filtroDataFim" className="block text-sm font-medium text-[#8B1A1A] mb-2">
                      Data Fim
                    </label>
                    <input
                      type="date"
                      id="filtroDataFim"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#C8A882]/40 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-l-4 border-blue-600">
                  <p className="text-sm text-blue-700 font-medium mb-1">Total de Sinistros</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border-l-4 border-purple-600">
                  <p className="text-sm text-purple-700 font-medium mb-1">Indenizações</p>
                  <p className="text-2xl font-bold text-purple-900">{formatarMoeda(stats.totalIndenizacao)}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border-l-4 border-orange-600">
                  <p className="text-sm text-orange-700 font-medium mb-1">Franquias</p>
                  <p className="text-2xl font-bold text-orange-900">{formatarMoeda(stats.totalFranquia)}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border-l-4 border-green-600">
                  <p className="text-sm text-green-700 font-medium mb-1">Valor Líquido</p>
                  <p className="text-2xl font-bold text-green-900">{formatarMoeda(stats.totalLiquido)}</p>
                </div>
              </div>

              {/* Lista de Sinistros Filtrados */}
              {sinistrosFiltrados.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#8B1A1A]">
                    Sinistros Encontrados ({sinistrosFiltrados.length})
                  </h3>
                  {sinistrosFiltrados.map((s, index) => {
                    const config = gravidadeConfig[s.gravidade];
                    const valorLiquido = calcularValorLiquido(s.valorIndenizacao, s.franquia);
                    return (
                      <div
                        key={index}
                        className="p-5 bg-gradient-to-r from-[#C8A882]/5 to-transparent rounded-lg border-l-4 border-gray-200 hover:shadow-md transition-shadow"
                        style={{ borderLeftColor: config.color.replace('bg-', '').replace('[', '').replace(']', '') }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`w-3 h-3 rounded-full ${config.color} shadow-sm mt-1.5`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <p className="font-bold text-gray-800 text-lg">{s.tipo}</p>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${config.bgLight} ${config.textColor}`}>
                                  {config.label}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Loja</p>
                                  <p className="font-medium text-gray-800">{s.loja}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Regulador</p>
                                  <p className="font-medium text-gray-800">{s.regulador}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Data Criação</p>
                                  <p className="font-medium text-gray-800">{formatarData(s.dataCriacao)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Data Resolução</p>
                                  <p className="font-medium text-gray-800">{formatarData(s.dataResolucao)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right bg-[#8B1A1A]/5 p-4 rounded-lg min-w-[200px]">
                            <p className="text-xs text-gray-500 mb-1">Indenização</p>
                            <p className="text-sm font-medium text-gray-700">{formatarMoeda(s.valorIndenizacao)}</p>
                            <p className="text-xs text-gray-500 mt-2 mb-1">Franquia</p>
                            <p className="text-sm font-medium text-gray-700">- {formatarMoeda(s.franquia)}</p>
                            <div className="border-t border-[#8B1A1A]/20 mt-2 pt-2">
                              <p className="text-xs text-gray-500 mb-1">Valor Líquido</p>
                              <p className="text-lg font-bold text-[#8B1A1A]">{formatarMoeda(valorLiquido)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhum sinistro encontrado com os filtros selecionados</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}