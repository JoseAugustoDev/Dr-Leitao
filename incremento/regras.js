(function (ambiente) {
  'use strict';

  function converterParaCentavos(valor) {
    const texto = String(valor).trim();
    if (!/^\d+(?:[,.]\d{1,2})?$/.test(texto)) {
      throw new Error('Informe um valor positivo com até duas casas decimais e sem separador de milhar.');
    }

    const [reais, decimais = ''] = texto.replace(',', '.').split('.');
    const centavos = Number(reais) * 100 + Number(decimais.padEnd(2, '0'));
    if (!Number.isSafeInteger(centavos) || centavos <= 0 || centavos > 100000000000) {
      throw new Error('Informe um valor entre R$ 0,01 e R$ 1.000.000.000,00.');
    }
    return centavos;
  }

  function dataValida(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
    const instante = Date.parse(`${data}T00:00:00Z`);
    return Number.isFinite(instante) && new Date(instante).toISOString().slice(0, 10) === data;
  }

  function criarLancamento(tipo, dados) {
    if (!['receita', 'despesa'].includes(tipo)) throw new Error('Tipo de lançamento inválido.');
    const descricao = dados.descricao.trim();
    const categoria = (dados.categoria || '').trim();

    if (!descricao || descricao.length > 80 || categoria.length > 40 || (tipo === 'despesa' && !categoria)) {
      throw new Error('Preencha a descrição e, para saídas, a categoria.');
    }
    if (!dataValida(dados.data)) throw new Error('Informe uma data válida.');
    if (tipo === 'despesa' && !['paga', 'pendente'].includes(dados.situacao)) {
      throw new Error('Selecione uma situação válida.');
    }

    return {
      tipo,
      descricao,
      centavos: converterParaCentavos(dados.valor),
      data: dados.data,
      categoria,
      situacao: tipo === 'despesa' ? dados.situacao : null,
    };
  }

  function calcularResumo(lancamentos) {
    let entradas = 0;
    let saidas = 0;

    for (const item of lancamentos) {
      if (!item || !['receita', 'despesa'].includes(item.tipo)) continue;
      if (!Number.isSafeInteger(item.centavos) || item.centavos <= 0 ||
          (item.tipo === 'despesa' && !['paga', 'pendente'].includes(item.situacao))) {
        throw new Error('Existem lançamentos salvos com dados inválidos.');
      }
      if (item.tipo === 'receita') entradas += item.centavos;
      if (item.tipo === 'despesa' && item.situacao === 'paga') saidas += item.centavos;
      if (!Number.isSafeInteger(entradas) || !Number.isSafeInteger(saidas)) {
        throw new Error('Os totais estão fora do intervalo permitido.');
      }
    }

    return { entradas, saidas, saldo: entradas - saidas };
  }

  const regras = { criarLancamento, calcularResumo };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = regras;
  } else {
    ambiente.RegrasLancamento = regras;
  }
})(globalThis);
