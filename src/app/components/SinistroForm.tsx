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
  const [step, setStep] = useState(1);

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

    if (
      sinistro.tipo &&
      sinistro.dataResolucao &&
      sinistro.loja &&
      sinistro.regulador
    ) {
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

      setStep(1);

      setMostrarSucesso(true);

      setTimeout(() => setMostrarSucesso(false), 3000);
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const calcularValorLiquido = (
    valorIndenizacao: number,
    franquia: number
  ) => {
    return Math.max(0, valorIndenizacao - franquia);
  };

  const filtrarSinistros = () => {
    return sinistros.filter((s) => {
      const matchLoja = !filtroLoja || s.loja === filtroLoja;
      const matchDataInicio =
        !filtroDataInicio || s.dataCriacao >= filtroDataInicio;
      const matchDataFim =
        !filtroDataFim || s.dataCriacao <= filtroDataFim;

      return matchLoja && matchDataInicio && matchDataFim;
    });
  };

  const sinistrosFiltrados = filtrarSinistros();

  const calcularEstatisticas = () => {
    const filtrados = sinistrosFiltrados;

    const totalIndenizacao = filtrados.reduce(
      (acc, s) => acc + s.valorIndenizacao,
      0
    );

    const totalFranquia = filtrados.reduce(
      (acc, s) => acc + s.franquia,
      0
    );

    const totalLiquido = filtrados.reduce(
      (acc, s) =>
        acc +
        calcularValorLiquido(
          s.valorIndenizacao,
          s.franquia
        ),
      0
    );

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

      <div className="absolute -top-10 -left-10 w-48 h-48 opacity-20 pointer-events-none hidden lg:block">
        <img src={img2} alt="" className="w-full h-full object-contain" />
      </div>

      <div className="absolute -bottom-10 -right-10 w-56 h-56 opacity-15 pointer-events-none hidden lg:block">
        <img src={img2} alt="" className="w-full h-full object-contain" />
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 relative z-10 border-t-4 border-[#8B1A1A]">

        <div className="flex items-center justify-between mb-6">

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#8B1A1A] rounded-full flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-[#8B1A1A]">
              Registro de Sinistros
            </h1>
          </div>

          <div className="w-40 h-16">
            <img
              src={logoFlamboyant}
              alt="Flamboyant"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

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
              <div className="mb-6 p-4 bg-[#C8A882]/20 border border-[#C8A882] rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#8B7355]" />
                <p className="text-[#8B7355]">
                  Sinistro registrado com sucesso!
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* STEPS */}
              <div className="flex items-center justify-center gap-4 flex-wrap">

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`px-5 py-2 rounded-full font-medium transition-all ${
                    step === 1
                      ? 'bg-[#8B1A1A] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Ocorrência
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`px-5 py-2 rounded-full font-medium transition-all ${
                    step === 2
                      ? 'bg-[#8B1A1A] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Lojista
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`px-5 py-2 rounded-full font-medium transition-all ${
                    step === 3
                      ? 'bg-[#8B1A1A] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Evidências
                </button>
              </div>

              {/* ETAPA 1 */}
              {step === 1 && (
                <div className="space-y-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div>
                      <label className="block text-sm font-medium text-[#8B1A1A] mb-2">
                        Tipo de Sinistro *
                      </label>

                      <input
                        type="text"
                        value={sinistro.tipo}
                        onChange={(e) =>
                          setSinistro({
                            ...sinistro,
                            tipo: e.target.value,
                          })
                        }
                        placeholder="Ex: Colisão"
                        className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#8B1A1A] mb-2">
                        Data de Resolução *
                      </label>

                      <input
                        type="date"
                        value={sinistro.dataResolucao}
                        onChange={(e) =>
                          setSinistro({
                            ...sinistro,
                            dataResolucao: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#8B1A1A] mb-2">
                        Valor da Indenização *
                      </label>

                      <input
                        type="number"
                        value={sinistro.valorIndenizacao || ''}
                        onChange={(e) =>
                          setSinistro({
                            ...sinistro,
                            valorIndenizacao:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#8B1A1A] mb-2">
                        Franquia
                      </label>

                      <input
                        type="number"
                        value={sinistro.franquia || ''}
                        onChange={(e) =>
                          setSinistro({
                            ...sinistro,
                            franquia:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#8B1A1A] mb-3">
                      Gravidade
                    </label>

                    <div className="grid grid-cols-3 gap-3">

                      {(Object.keys(
                        gravidadeConfig
                      ) as Gravidade[]).map((nivel) => {
                        const config = gravidadeConfig[nivel];

                        return (
                          <button
                            key={nivel}
                            type="button"
                            onClick={() =>
                              setSinistro({
                                ...sinistro,
                                gravidade: nivel,
                              })
                            }
                            className={`p-4 rounded-lg border-2 transition-all ${
                              sinistro.gravidade === nivel
                                ? `${config.borderColor} ${config.bgLight}`
                                : 'border-[#C8A882]/30'
                            }`}
                          >
                            <span
                              className={`font-medium ${
                                sinistro.gravidade === nivel
                                  ? config.textColor
                                  : 'text-gray-600'
                              }`}
                            >
                              {config.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 2 */}
              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div>
                    <label className="block text-sm font-medium text-[#8B1A1A] mb-2">
                      Loja *
                    </label>

                    <select
                      value={sinistro.loja}
                      onChange={(e) =>
                        setSinistro({
                          ...sinistro,
                          loja: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg"
                    >
                      <option value="">
                        Selecione uma loja
                      </option>

                      {lojas.map((loja) => (
                        <option key={loja} value={loja}>
                          {loja}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#8B1A1A] mb-2">
                      Regulador *
                    </label>

                    <select
                      value={sinistro.regulador}
                      onChange={(e) =>
                        setSinistro({
                          ...sinistro,
                          regulador: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg"
                    >
                      <option value="">
                        Selecione um regulador
                      </option>

                      {reguladores.map((regulador) => (
                        <option
                          key={regulador}
                          value={regulador}
                        >
                          {regulador}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ETAPA 3 */}
              {step === 3 && (
                <div className="space-y-6">

                  <div className="border-2 border-dashed border-[#C8A882]/40 rounded-2xl p-10 text-center">

                    <p className="text-lg font-semibold text-[#8B1A1A] mb-2">
                      Anexar Evidências
                    </p>

                    <input
                      type="file"
                      multiple
                      className="block w-full text-sm text-gray-500"
                    />
                  </div>

                  <textarea
                    rows={5}
                    placeholder="Observações..."
                    className="w-full px-4 py-3 border-2 border-[#C8A882]/40 rounded-lg resize-none"
                  />
                </div>
              )}

              {/* BOTÕES */}
              <div className="flex justify-between pt-4">

                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1}
                  className="px-6 py-3 rounded-lg border disabled:opacity-40"
                >
                  Voltar
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="px-6 py-3 rounded-lg bg-[#8B1A1A] text-white"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-lg bg-[#8B1A1A] text-white"
                  >
                    Registrar Sinistro
                  </button>
                )}
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-6">

            <h2 className="text-2xl font-bold text-[#8B1A1A]">
              Relatórios de Sinistros
            </h2>

            <div className="bg-[#C8A882]/10 p-6 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <select
                  value={filtroLoja}
                  onChange={(e) => setFiltroLoja(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Todas as lojas</option>

                  {lojas.map((loja) => (
                    <option key={loja} value={loja}>
                      {loja}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) =>
                    setFiltroDataInicio(e.target.value)
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />

                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) =>
                    setFiltroDataFim(e.target.value)
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              <div className="bg-blue-50 p-6 rounded-lg">
                <p>Total</p>
                <p className="text-3xl font-bold">
                  {stats.total}
                </p>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg">
                <p>Indenizações</p>
                <p className="text-2xl font-bold">
                  {formatarMoeda(stats.totalIndenizacao)}
                </p>
              </div>

              <div className="bg-orange-50 p-6 rounded-lg">
                <p>Franquias</p>
                <p className="text-2xl font-bold">
                  {formatarMoeda(stats.totalFranquia)}
                </p>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <p>Valor Líquido</p>
                <p className="text-2xl font-bold">
                  {formatarMoeda(stats.totalLiquido)}
                </p>
              </div>
            </div>

            {sinistrosFiltrados.length > 0 ? (
              <div className="space-y-3">

                {sinistrosFiltrados.map((s, index) => (
                  <div
                    key={index}
                    className="p-5 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex justify-between gap-4">

                      <div>
                        <p className="font-bold text-lg">
                          {s.tipo}
                        </p>

                        <p>{s.loja}</p>

                        <p>{s.regulador}</p>

                        <p>
                          {formatarData(s.dataCriacao)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-[#8B1A1A]">
                          {formatarMoeda(
                            calcularValorLiquido(
                              s.valorIndenizacao,
                              s.franquia
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">

                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />

                <p className="text-gray-600">
                  Nenhum sinistro encontrado
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}