# -*- coding: utf-8 -*-
import base64
import binascii
from gmssl import sm2, func


if __name__ == '__main__':
    private_key = '00B9AB0B828FF68872F21A837FC303668428DEA11DCD1B24429D0C99E24EED83D5'
    public_key = 'B9C9A6E04E9C91F7BA880429273747D7EF5DDEB0BB2FF6317EB00BEF331A83081A6994B8993F3F5D6EADDDB81872266C87C018FB4162F5AF347B483E24620207'

    sm2_crypt = sm2.CryptSM2(
        public_key=public_key, private_key=private_key)
    data = u"!@#123QWEqwe"
    enc_data = sm2_crypt.encrypt(data)
    # enc_data = '041da5426d42931afd0da8b74eef2bcd5ca6a2164e08ebacddf321366e7e078044253b7608947701fb8f676479c5c311c0914b334f43e47b61b645e6642576a35a207bed38eb76a75bf9db5045da0ce1028f79878d26ad5562aaf241b84b4ee5d658eea45ac0ffd42b'
    dec_data = sm2_crypt.decrypt(enc_data)
    print("dec_data:%s" % dec_data)
    assert data == dec_data

    print("-----------------test sign and verify---------------")
    random_hex_str = func.random_hex(sm2_crypt.para_len)
    sign = sm2_crypt.sign(data, random_hex_str)
    print('sign:%s' % sign)
    verify = sm2_crypt.verify(sign, data)
    print('verify:%s' % verify)
    assert verify
