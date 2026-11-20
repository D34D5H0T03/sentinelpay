import { USE_MOCK } from './config';
import { request } from './http';
import { db } from '../mock/db';
import { delay } from '../mock/delay';
import { me } from './auth';

export async function list() {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    if (!currentUser) return [];

    return db.beneficiaries.filter((b) => b.owner_user_id === currentUser.user_id);
  }
  return request('GET', '/beneficiaries');
}

export async function create({ nickname, walletNo }) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    if (!currentUser) throw new Error('Unauthorized');

    const targetWallet = db.wallets.find((w) => w.wallet_no === String(walletNo).trim());
    if (!targetWallet) {
      const err = new Error('Recipient wallet not found.');
      err.code = 'DESTINATION_NOT_FOUND';
      throw err;
    }

    const holder = db.users.find((u) => u.user_id === targetWallet.user_id);
    const newId = db.beneficiaries.length + 1;
    const newBen = {
      beneficiary_id: newId,
      owner_user_id: currentUser.user_id,
      wallet_no: targetWallet.wallet_no,
      nickname: nickname.trim(),
      holder_name: holder ? holder.name : 'Unknown',
      created_at: new Date().toISOString(),
    };

    db.beneficiaries.push(newBen);
    return newBen;
  }
  return request('POST', '/beneficiaries', { nickname, walletNo });
}

export async function update(id, { nickname }) {
  if (USE_MOCK) {
    await delay();
    const item = db.beneficiaries.find((b) => b.beneficiary_id === Number(id));
    if (!item) {
      const err = new Error('Beneficiary not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }
    item.nickname = nickname.trim();
    return item;
  }
  return request('PUT', `/beneficiaries/${id}`, { nickname });
}

export async function remove(id) {
  if (USE_MOCK) {
    await delay();
    const index = db.beneficiaries.findIndex((b) => b.beneficiary_id === Number(id));
    if (index !== -1) {
      db.beneficiaries.splice(index, 1);
    }
    return { success: true };
  }
  return request('DELETE', `/beneficiaries/${id}`);
}
