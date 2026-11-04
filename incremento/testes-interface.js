const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const regras = require('./regras');

const CHAVE_LANCAMENTOS = 'dr-leitao-lancamentos-v1';
const CHAVE_SALDO_ANTIGO = 'dr-leitao-saldo-inicial-v1';

class Elemento {
  constructor() {
    this.value = '';
    this.textContent = '';
    this.hidden = false;
    this.children = [];
    this.eventos = {};
    this.classes = new Set();
    this.classList = {
      add: (nome) => this.classes.add(nome),
      remove: (nome) => this.classes.delete(nome),
      contains: (nome) => this.classes.has(nome),
    };
  }

  addEventListener(evento, callback) { this.eventos[evento] = callback; }
  replaceChildren(...filhos) { this.children = filhos; }
  append(...filhos) { this.children.push(...filhos); }
  reset() { this.foiReiniciado = true; }
  clicar() { this.eventos.click(); }
}

function iniciar({ confirmar, dados, falharAoRemover = false }) {
  const ids = [
    'formulario-lancamento', 'tipo', 'categoria', 'label-categoria', 'grupo-situacao',
    'mensagem', 'lista-entradas', 'lista-saidas', 'entrada-vazia', 'saida-vazia',
    'erro-dados', 'total-entradas', 'total-saidas', 'saldo-atual', 'limpar-sessao',
    'mensagem-limpeza',
  ];
  const elementos = Object.fromEntries(ids.map((id) => [id, new Elemento()]));
  elementos.tipo.value = 'despesa';
  const armazenamento = new Map(Object.entries(dados));
  const localStorage = {
    getItem: (chave) => armazenamento.has(chave) ? armazenamento.get(chave) : null,
    removeItem: (chave) => {
      if (falharAoRemover) throw new Error('Armazenamento indisponível');
      armazenamento.delete(chave);
    },
  };
  const document = {
    getElementById: (id) => elementos[id],
    createElement: () => new Elemento(),
  };
  const window = { confirm: () => confirmar, addEventListener() {} };
  const codigo = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  vm.runInNewContext(codigo, { document, window, localStorage, RegrasLancamento: regras, Intl });
  return { elementos, armazenamento };
}

const lancamentos = JSON.stringify([
  { tipo: 'receita', descricao: 'Salário', centavos: 100000, data: '2026-11-01' },
  { tipo: 'despesa', descricao: 'Mercado', centavos: 12345, data: '2026-11-02', categoria: 'Alimentação', situacao: 'paga' },
]);

test('cancelar a limpeza preserva os lançamentos e o saldo', () => {
  const { elementos, armazenamento } = iniciar({ confirmar: false, dados: { [CHAVE_LANCAMENTOS]: lancamentos } });
  elementos['limpar-sessao'].clicar();
  assert.equal(armazenamento.get(CHAVE_LANCAMENTOS), lancamentos);
  assert.match(elementos['saldo-atual'].textContent, /876,55/);
  assert.equal(elementos['lista-saidas'].children.length, 1);
});

test('confirmar apaga os dados do projeto, atualiza a tela e preserva outras chaves', () => {
  const { elementos, armazenamento } = iniciar({
    confirmar: true,
    dados: { [CHAVE_LANCAMENTOS]: lancamentos, [CHAVE_SALDO_ANTIGO]: '1000', outra_chave: 'preservar' },
  });
  elementos['limpar-sessao'].clicar();
  assert.equal(armazenamento.has(CHAVE_LANCAMENTOS), false);
  assert.equal(armazenamento.has(CHAVE_SALDO_ANTIGO), false);
  assert.equal(armazenamento.get('outra_chave'), 'preservar');
  assert.match(elementos['saldo-atual'].textContent, /0,00/);
  assert.equal(elementos['lista-entradas'].children.length, 0);
  assert.equal(elementos['lista-saidas'].children.length, 0);
  assert.equal(elementos['entrada-vazia'].hidden, false);
  assert.equal(elementos['saida-vazia'].hidden, false);
  assert.equal(elementos['formulario-lancamento'].foiReiniciado, true);
  assert.match(elementos['mensagem-limpeza'].textContent, /apagados/);
});

test('permite limpar dados corrompidos e recuperar a tela', () => {
  const { elementos, armazenamento } = iniciar({ confirmar: true, dados: { [CHAVE_LANCAMENTOS]: '{inválido' } });
  assert.equal(elementos['erro-dados'].hidden, false);
  elementos['limpar-sessao'].clicar();
  assert.equal(armazenamento.has(CHAVE_LANCAMENTOS), false);
  assert.equal(elementos['erro-dados'].hidden, true);
  assert.match(elementos['saldo-atual'].textContent, /0,00/);
});

test('informa erro e mantém a tela consistente quando o armazenamento falha', () => {
  const { elementos, armazenamento } = iniciar({
    confirmar: true, dados: { [CHAVE_LANCAMENTOS]: lancamentos }, falharAoRemover: true,
  });
  elementos['limpar-sessao'].clicar();
  assert.equal(armazenamento.get(CHAVE_LANCAMENTOS), lancamentos);
  assert.match(elementos['mensagem-limpeza'].textContent, /Não foi possível/);
  assert.equal(elementos['mensagem-limpeza'].classList.contains('erro'), true);
  assert.match(elementos['saldo-atual'].textContent, /876,55/);
});
