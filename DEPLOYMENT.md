\# Agent Credential Contract — Testnet Deployment Record



\## Contract

\- \*\*Contract ID:\*\* CDDWCPMK53VWWDGQ7O3HLXFOQOFTQOTRGJMPCUEBGBUBX2QA365OH2JU

\- \*\*Network:\*\* Stellar Testnet (Test SDF Network ; September 2015)

\- \*\*Wasm Hash:\*\* b160f5c9c9d7db22ac89b52a85ff1e01dc434d3c5072006ab77c58d44decc955

\- \*\*Explorer:\*\* https://lab.stellar.org/r/testnet/contract/CDDWCPMK53VWWDGQ7O3HLXFOQOFTQOTRGJMPCUEBGBUBX2QA365OH2JU



\## Identities used

\- \*\*Admin / deployer:\*\* GACX2ATLM5Y4IGMJXCZSFQ2ZCFJUPRMG3SFAP5IJT7NT3B6DUBBYBNZZ (alias: hackathon-deployer)

\- \*\*Verifier:\*\* GB5GNVKXCGJQ5VDTQHC2EOFFFFFBRYYTUQKPMJTBOSZWWTGH3CBQJBG3 (alias: verifier-1)

\- \*\*Agent (credential holder):\*\* GDOU7ARHKYWXRB6OJ2RAY4E73GHW4I24GHNIEACNYAKMQHV5RBDJSZQX (alias: agent-1)



\## Verified flow (all transactions confirmed on testnet)

1\. `initialize(admin)` — tx 361c2e0c95aded045eaa4b93c1614d8eb4f45f2d1546e3d19d52c71574ee5d30

2\. `register\_verifier(verifier-1)` — tx 10294097d1505ce9c875e484b4d22ec38578a6b3d96e5527612341b69ec2666f

3\. `issue\_credential(verifier-1 -> agent-1, "safety\_checked", proof\_hash, 3600s)` — tx 815f4ec1326335597a83bd7e591f39903b36196ae8a16c8f5d503867c2392421

4\. `has\_credential(agent-1, "safety\_checked")` -> \*\*true\*\* (confirmed live)



\## Reproduce locally

```powershell

stellar contract invoke --id CDDWCPMK53VWWDGQ7O3HLXFOQOFTQOTRGJMPCUEBGBUBX2QA365OH2JU --source hackathon-deployer --network testnet -- has\_credential --agent GDOU7ARHKYWXRB6OJ2RAY4E73GHW4I24GHNIEACNYAKMQHV5RBDJSZQX --capability safety\_checked

```

