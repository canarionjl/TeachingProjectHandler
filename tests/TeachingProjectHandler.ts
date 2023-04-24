import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TeachingProjectHandler } from "../target/types/teaching_project_handler";
import chai, { assert } from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import * as CryptoJS from 'crypto-js';
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";

chai.use(chaiAsPromised);

// helper functions
const createWallet = async (connection: anchor.web3.Connection, funds: number)
  : Promise<anchor.web3.Keypair> => {
  const wallet = anchor.web3.Keypair.generate();
  const tx = await connection.requestAirdrop(
    wallet.publicKey,
    anchor.web3.LAMPORTS_PER_SOL * funds
  );
  // wait for confirmation
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: tx
  });

  // check balance
  const balance = await connection.getBalance(wallet.publicKey);
  if (balance < funds) {
    throw new Error("Requested amount exceeds target" +
      "network's airdrop limit.");
  }
  return wallet;
};

const initializeHighRank = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id:anchor.BN): Promise<String> => {

  const pda = await findPDAforHighRank(program.programId, authority.publicKey)

  const result = await program.methods.createHighRank("1111", id)
    .accounts({
      authority: authority.publicKey,
      highRankAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeProfessor = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id:anchor.BN): Promise<String> => {

  const pda = await findPDAforProfessor(program.programId, authority.publicKey)

  const result = await program.methods.createProfessor("2222", id)
    .accounts({
      authority: authority.publicKey,
      professorAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeStudent = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id:anchor.BN): Promise<String> => {

  const pda = await findPDAforStudent(program.programId, authority.publicKey)

  const result = await program.methods.createStudent("3333", id)
    .accounts({
      authority: authority.publicKey,
      studentAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const getAllAccountsByAuthority = async (accounts: anchor.AccountClient<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await accounts.all([
    {
      memcmp: {
        offset: 8,
        bytes: authority.toBase58()
      }
    }
  ]);
}

const findPDAforHighRank = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("highRank"), authority.toBytes()],
    programId
  );
  return pda;
}

const findPDAforProfessor = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("professor"), authority.toBytes()],
    programId
  );
  return pda;
}

const findPDAforStudent = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("student"), authority.toBytes()],
    programId
  );
  return pda;
}


const fetchHighRankAccount = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await program.account.highRank.fetch(await findPDAforHighRank(program.programId, authority))
}

const fetchProfessorAccount = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await program.account.professor.fetch(await findPDAforProfessor(program.programId, authority))
}

const fetchStudentAccount = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await program.account.student.fetch(await findPDAforStudent(program.programId, authority))
}

const getReturnLog = (confirmedTransaction) => {
  const prefix = "Program return: ";
  let log = confirmedTransaction.meta.logMessages.find((log) =>
    log.startsWith(prefix)
  );
  log = log.slice(prefix.length);
  const [key, data] = log.split(" ", 2);
  const buffer = Buffer.from(data, "base64");
  return [key, data, buffer];
};


// test suite
describe("Testing the Teaching Project Handler Smart Contract...\n\n", () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());


  // shared objects
  const program = anchor.workspace.TeachingProjectHandler as Program<TeachingProjectHandler>;
  const connection = anchor.getProvider().connection;
  let wallet1: anchor.web3.Keypair;
  let wallet2: anchor.web3.Keypair;
  let wallet3: anchor.web3.Keypair;


  before(async () => {

    wallet1 = await createWallet(connection, 10);
    wallet2 = await createWallet(connection, 10);
    wallet3 = await createWallet(connection, 10);

  });

  it("HighRank is initializated properly", async () => {

    const signature = await initializeHighRank(program, wallet1, new anchor.BN(1));
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), {commitment: "confirmed"});
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet1 = await fetchHighRankAccount(program, wallet1.publicKey);
   
    expect(accountWallet1.id.eq(new anchor.BN(1))).to.be.true;
    assert.equal(accountWallet1.identifierCodeHash, CryptoJS.SHA256("1111").toString());
    expect(Boolean(buffer)).to.be.true;
   
  });

  it("HighRank is initializated with incorrect id (smaller than 0)", async () => {
  
    try {
        await initializeHighRank(program, wallet1, new anchor.BN(-1));
    } catch (err) {
        assert.instanceOf(err, Error);
        assert.include(err.toString(), "AnchorError caused by account: high_rank_account");
        return;
    }

    assert.fail("Expected an error to be thrown");
    
  });
  
  it("Professor is initializated properly", async () => {

    const signature = await initializeProfessor(program, wallet2, new anchor.BN(1));
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), {commitment: "confirmed"});
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet2 = await fetchProfessorAccount(program, wallet2.publicKey);
   
    expect(accountWallet2.id.eq(new anchor.BN(1))).to.be.true;
    assert.equal(accountWallet2.identifierCodeHash, CryptoJS.SHA256("2222").toString());
    expect(Boolean(buffer)).to.be.true;
   
  });


  it("Reinitializing the same professor...", async () => {

    const signature = await initializeProfessor(program, wallet2, new anchor.BN(1));
    // await connection.confirmTransaction(signature.toString())
    // const transaction = await connection.getTransaction(signature.toString(), {commitment: "confirmed"});
    // const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet2 = await fetchProfessorAccount(program, wallet2.publicKey);
   
    expect(accountWallet2.id.eq(new anchor.BN(1))).to.be.true;
    assert.equal(accountWallet2.identifierCodeHash, CryptoJS.SHA256("2222").toString());
    // expect(Boolean(buffer)).to.be.true;

    console.log(accountWallet2.id)

    const signature2 = await initializeProfessor(program, wallet2, new anchor.BN(3));
    // await connection.confirmTransaction(signature2.toString())
    // const transaction2 = await connection.getTransaction(signature.toString(), {commitment: "confirmed"});
    // const [key2, data2, buffer2] = getReturnLog(transaction);
    const accountWallet22 = await fetchProfessorAccount(program, wallet2.publicKey);

    console.log(accountWallet22.id)
   
    expect(accountWallet22.id.eq(new anchor.BN(1))).to.be.true;
    assert.equal(accountWallet22.identifierCodeHash, CryptoJS.SHA256("2222").toString());
   
  });

  it("Student is initializated properly", async () => {

    const signature = await initializeStudent(program, wallet3, new anchor.BN(1));
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), {commitment: "confirmed"});
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet3 = await fetchStudentAccount(program, wallet3.publicKey);
   
    expect(accountWallet3.id.eq(new anchor.BN(1))).to.be.true;
    assert.equal(accountWallet3.identifierCodeHash, CryptoJS.SHA256("3333").toString());
    expect(Boolean(buffer)).to.be.true;
   
  });


  
  
  
  
  
  





});
