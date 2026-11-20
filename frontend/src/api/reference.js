import { USE_MOCK } from './config';
import { request } from './http';
import { db } from '../mock/db';
import { delay } from '../mock/delay';

export async function getReference() {
  if (USE_MOCK) {
    await delay(150);
    return {
      roles: db.roles,
      fee_rules: db.feeRules,
      risk_rules: db.riskRules,
    };
  }
  return request('GET', '/reference');
}
