(function () {
  'use strict';

  const CHAVE_LANCAMENTOS = 'dr-leitao-lancamentos-v1';
  const CHAVE_SALDO_ANTIGO = 'dr-leitao-saldo-inicial-v1';
  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const formulario = document.getElementById('formulario-lancamento');
  const tipo = document.getElementById('tipo');
  const categoria = document.getElementById('categoria');
  const labelCategoria = document.getElementById('label-categoria');
  const grupoSituacao = document.getElementById('grupo-situacao');
  const mensagem = document.getElementById('mensagem');
  const listaEntradas = document.getElementById('lista-entradas');
  const listaSaidas = document.getElementById('lista-saidas');
  const erroDados = document.getElementById('erro-dados');
  const botaoLimpar = document.getElementById('limpar-sessao');
  const mensagemLimpeza = document.getElementById('mensagem-limpeza');

  function lerLancamentos() {
    const dados = localStorage.getItem(CHAVE_LANCAMENTOS);
    const lancamentos = dados === null ? [] : JSON.parse(dados);
    if (!Array.isArray(lancamentos)) throw new Error('Não foi possível ler os lançamentos salvos.');
    return lancamentos;
  }

  function salvarLancamento(lancamento) {
    const lancamentos = lerLancamentos();
    const id = globalThis.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    lancamentos.push({ ...lancamento, id });
    localStorage.setItem(CHAVE_LANCAMENTOS, JSON.stringify(lancamentos));
  }

  function mostrarLista(lista, avisoVazio, lancamentos) {
    lista.replaceChildren();
    avisoVazio.hidden = lancamentos.length > 0;

    for (const lancamento of lancamentos.slice().reverse()) {
      const item = document.createElement('li');
      const detalhes = document.createElement('div');
      const descricao = document.createElement('strong');
      const informacoes = document.createElement('span');
      const valor = document.createElement('strong');
      const data = typeof lancamento.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lancamento.data)
        ? lancamento.data.split('-').reverse().join('/') : 'Data indisponível';
      const categoria = typeof lancamento.categoria === 'string' && lancamento.categoria.trim()
        ? lancamento.categoria : 'Sem categoria';
      const situacao = lancamento.tipo === 'despesa'
        ? (lancamento.situacao === 'paga' ? ' · Paga' : lancamento.situacao === 'pendente' ? ' · Pendente' : ' · Situação indisponível')
        : '';

      item.className = 'registro';
      detalhes.className = 'registro-detalhes';
      valor.className = 'registro-valor';
      descricao.textContent = typeof lancamento.descricao === 'string' ? lancamento.descricao : 'Descrição indisponível';
      informacoes.textContent = `${data} · ${categoria}${situacao}`;
      valor.textContent = Number.isSafeInteger(lancamento.centavos)
        ? moeda.format(lancamento.centavos / 100) : 'Valor indisponível';
      detalhes.append(descricao, informacoes);
      item.append(detalhes, valor);
      lista.append(item);
    }
  }

  function atualizarTela() {
    try {
      const lancamentos = lerLancamentos();
      const entradas = lancamentos.filter((item) => item && item.tipo === 'receita');
      const saidas = lancamentos.filter((item) => item && item.tipo === 'despesa');
      mostrarLista(listaEntradas, document.getElementById('entrada-vazia'), entradas);
      mostrarLista(listaSaidas, document.getElementById('saida-vazia'), saidas);

      const resumo = RegrasLancamento.calcularResumo(lancamentos);
      document.getElementById('total-entradas').textContent = moeda.format(resumo.entradas / 100);
      document.getElementById('total-saidas').textContent = moeda.format(resumo.saidas / 100);
      document.getElementById('saldo-atual').textContent = moeda.format(resumo.saldo / 100);
      erroDados.hidden = true;
    } catch (erro) {
      document.getElementById('total-entradas').textContent = 'Indisponível';
      document.getElementById('total-saidas').textContent = 'Indisponível';
      document.getElementById('saldo-atual').textContent = 'Indisponível';
      erroDados.textContent = 'Não foi possível carregar ou calcular os lançamentos salvos neste navegador.';
      erroDados.hidden = false;
    }
  }

  function atualizarCampos() {
    const despesa = tipo.value === 'despesa';
    grupoSituacao.hidden = !despesa;
    categoria.required = despesa;
    labelCategoria.textContent = despesa ? 'Categoria' : 'Categoria (opcional)';
  }

  tipo.addEventListener('change', atualizarCampos);
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();

    try {
      const dados = Object.fromEntries(new FormData(formulario));
      const lancamento = RegrasLancamento.criarLancamento(dados.tipo, dados);
      salvarLancamento(lancamento);
      formulario.reset();
      atualizarCampos();
      mensagem.textContent = 'Lançamento cadastrado com sucesso.';
      mensagem.classList.remove('erro');
      mensagemLimpeza.textContent = '';
      mensagemLimpeza.classList.remove('erro');
      atualizarTela();
    } catch (erro) {
      mensagem.textContent = erro instanceof SyntaxError
        ? 'Não foi possível ler os dados já salvos neste navegador.'
        : erro instanceof DOMException ? 'Não foi possível salvar neste navegador.' : erro.message;
      mensagem.classList.add('erro');
    }
  });

  botaoLimpar.addEventListener('click', () => {
    const confirmado = window.confirm(
      'Apagar todos os lançamentos salvos neste navegador? Esta ação não pode ser desfeita.'
    );
    if (!confirmado) return;

    try {
      localStorage.removeItem(CHAVE_LANCAMENTOS);
      localStorage.removeItem(CHAVE_SALDO_ANTIGO);
      formulario.reset();
      atualizarCampos();
      mensagem.textContent = '';
      mensagem.classList.remove('erro');
      mensagemLimpeza.textContent = 'Sessão limpa e lançamentos apagados.';
      mensagemLimpeza.classList.remove('erro');
    } catch (erro) {
      mensagemLimpeza.textContent = 'Não foi possível limpar todos os dados neste navegador.';
      mensagemLimpeza.classList.add('erro');
    }
    atualizarTela();
  });

  window.addEventListener('storage', (evento) => {
    if (evento.key === CHAVE_LANCAMENTOS || evento.key === null) {
      mensagemLimpeza.textContent = '';
      mensagemLimpeza.classList.remove('erro');
      atualizarTela();
    }
  });
  atualizarCampos();
  atualizarTela();
})();
