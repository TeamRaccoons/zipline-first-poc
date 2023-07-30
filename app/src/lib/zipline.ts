export type Zipline = {
  "version": "0.1.0",
  "name": "zipline",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "pulley",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "zipline",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ethAddress",
          "type": {
            "array": [
              "u8",
              20
            ]
          }
        }
      ]
    },
    {
      "name": "execute",
      "docs": [
        "fee payer needs to get something out of this",
        "this allows tx failures to be replayed since the nonce is not increased,"
      ],
      "accounts": [
        {
          "name": "pulley",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "zipline",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "signature",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "recoveryId",
          "type": "u8"
        },
        {
          "name": "ethAddress",
          "type": {
            "array": [
              "u8",
              20
            ]
          }
        },
        {
          "name": "prefix",
          "type": "string"
        },
        {
          "name": "message",
          "type": {
            "defined": "ZiplineMessage"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "pulley",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ziplineBump",
            "type": "u8"
          },
          {
            "name": "ethAddress",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "nonce",
            "docs": [
              "Think more about implication of overflow and potential replay, most likely we need the blockhash and the nonce"
            ],
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ZiplineAccountMeta",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "publicKey"
          },
          {
            "name": "isSigner",
            "type": "bool"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "ZiplineInstruction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "type": "publicKey"
          },
          {
            "name": "accounts",
            "type": {
              "vec": {
                "defined": "ZiplineAccountMeta"
              }
            }
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "ZiplineMessage",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "instructions",
            "type": {
              "vec": {
                "defined": "ZiplineInstruction"
              }
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidNonce"
    },
    {
      "code": 6001,
      "name": "InvalidDataOffsets"
    },
    {
      "code": 6002,
      "name": "InvalidEthAddress"
    },
    {
      "code": 6003,
      "name": "MissingSignature"
    }
  ]
};

export const IDL: Zipline = {
  "version": "0.1.0",
  "name": "zipline",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "pulley",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "zipline",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ethAddress",
          "type": {
            "array": [
              "u8",
              20
            ]
          }
        }
      ]
    },
    {
      "name": "execute",
      "docs": [
        "fee payer needs to get something out of this",
        "this allows tx failures to be replayed since the nonce is not increased,"
      ],
      "accounts": [
        {
          "name": "pulley",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "zipline",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "signature",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "recoveryId",
          "type": "u8"
        },
        {
          "name": "ethAddress",
          "type": {
            "array": [
              "u8",
              20
            ]
          }
        },
        {
          "name": "prefix",
          "type": "string"
        },
        {
          "name": "message",
          "type": {
            "defined": "ZiplineMessage"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "pulley",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ziplineBump",
            "type": "u8"
          },
          {
            "name": "ethAddress",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "nonce",
            "docs": [
              "Think more about implication of overflow and potential replay, most likely we need the blockhash and the nonce"
            ],
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ZiplineAccountMeta",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "publicKey"
          },
          {
            "name": "isSigner",
            "type": "bool"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "ZiplineInstruction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "type": "publicKey"
          },
          {
            "name": "accounts",
            "type": {
              "vec": {
                "defined": "ZiplineAccountMeta"
              }
            }
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "ZiplineMessage",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "instructions",
            "type": {
              "vec": {
                "defined": "ZiplineInstruction"
              }
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidNonce"
    },
    {
      "code": 6001,
      "name": "InvalidDataOffsets"
    },
    {
      "code": 6002,
      "name": "InvalidEthAddress"
    },
    {
      "code": 6003,
      "name": "MissingSignature"
    }
  ]
};
