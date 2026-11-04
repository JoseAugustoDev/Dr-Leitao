const test = require('node:test');
const assert = require('node:assert/strict');
const { criarLancamento, calcularResumo } = require('./regras');

const dados = {
  descricao: ' Mercado ',
  valor: '123,45',
  data: '2026-11-10',
  categoria: ' Alimentação ',
  situacao: 'pendente',
};

test('cria saídas e entradas com valores em centavos', () => {
  assert.deepEqual(criarLancamento('despesa', dados), {
    tipo: 'despesa', descricao: 'Mercado', centavos: 12345,
    data: '2026-11-10', categoria: 'Alimentação', situacao: 'pendente',
  });
  assert.deepEqual(criarLancamento('receita', { ...dados, valor: '0.01', categoria: '' }), {
    tipo: 'receita', descricao: 'Mercado', centavos: 1,
    data: '2026-11-10', categoria: '', situacao: null,
  });
});

test('rejeita valores inválidos ou fora do limite', () => {
  for (const valor of ['0', '-1', '1,234', 'abc', '1e3', '1000000001']) {
    assert.throws(() => criarLancamento('despesa', { ...dados, valor }));
  }
});

test('rejeita tipo, datas, campos e situação inválidos', () => {
  assert.throws(() => criarLancamento('outro', dados));
  assert.throws(() => criarLancamento('receita', { ...dados, data: '2026-02-30' }));
  assert.throws(() => criarLancamento('despesa', { ...dados, descricao: ' ' }));
  assert.throws(() => criarLancamento('despesa', { ...dados, categoria: '' }));
  assert.throws(() => criarLancamento('despesa', { ...dados, situacao: 'outro' }));
});

test('calcula o saldo com entradas e saídas pagas, sem descontar pendentes', () => {
  const lancamentos = [
    { tipo: 'receita', centavos: 100000 },
    { tipo: 'despesa', centavos: 12345, situacao: 'paga' },
    { tipo: 'despesa', centavos: 5000, situacao: 'pendente' },
  ];
  assert.deepEqual(calcularResumo(lancamentos), { entradas: 100000, saidas: 12345, saldo: 87655 });
  assert.deepEqual(calcularResumo([lancamentos[1]]), { entradas: 0, saidas: 12345, saldo: -12345 });
  assert.deepEqual(calcularResumo([]), { entradas: 0, saidas: 0, saldo: 0 });
});

test('não calcula totais enganosos para registros inválidos', () => {
  assert.throws(() => calcularResumo([{ tipo: 'receita' }]));
  assert.throws(() => calcularResumo([{ tipo: 'despesa', centavos: 100, situacao: 'desconhecida' }]));
  assert.throws(() => calcularResumo([
    { tipo: 'receita', centavos: Number.MAX_SAFE_INTEGER },
    { tipo: 'receita', centavos: 1 },
  ]));
});
