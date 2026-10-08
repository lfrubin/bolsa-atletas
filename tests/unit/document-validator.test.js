import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDocument } from '../../src/backend/src/utils/document-validator.js';

test('Validação de Documentos - CPF e CNPJ', async (t) => {
  await t.test('Deve validar um CPF correto', () => {
    assert.equal(validateDocument('11144477735'), true);
  });

  await t.test('Deve rejeitar um CPF com dígitos repetidos', () => {
    assert.equal(validateDocument('11111111111'), false);
  });

  await t.test('Deve rejeitar um CPF com dígito verificador inválido', () => {
    assert.equal(validateDocument('11144477700'), false);
  });

  await t.test('Deve validar um CNPJ correto', () => {
    assert.equal(validateDocument('11222333000181'), true);
  });

  await t.test('Deve rejeitar documento com tamanho inválido', () => {
    assert.equal(validateDocument('12345'), false);
  });
});