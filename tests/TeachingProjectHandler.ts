import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TeachingProjectHandler } from "../target/types/teaching_project_handler";
import chai, { assert } from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import CryptoJS from 'crypto-js';
import * as Borsh from 'borsh';
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { ConfirmOptions } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount } from "@solana/spl-token";





chai.use(chaiAsPromised);
const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

// helper functions
const createWallet = async (connection: anchor.web3.Connection, funds: number): Promise<anchor.web3.Keypair> => {
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
}

const getExtraFunds = async (connection: anchor.web3.Connection, funds: number, wallet: anchor.web3.Keypair) => {
  const tx = await connection.requestAirdrop(
    wallet.publicKey,
    anchor.web3.LAMPORTS_PER_SOL * funds
  );
}

const initializeHighRank = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair): Promise<String> => {

  const pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "highRank")
  const mint = await findPDAforMint(program.programId)
  const [mint_authority_pda, mint_authority_bump] = await findPDAforMintAuthority(program.programId, mint, "1111")

  const result = await program.methods.createHighRank("1111")
    .accounts({
      authority: authority.publicKey,
      highRankIdHandler: id_generator_pda,
      highRankAccount: pda,
      // mint: mint,
      // mintAuthority: mint_authority_pda,

      systemProgram: anchor.web3.SystemProgram.programId,

      // tokenProgram: TOKEN_PROGRAM_ID,
      // associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      // rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeProfessor = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, subjects: Array<number>): Promise<String> => {

  const pda = await findPDAforProfessor(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "professor")
  const high_rank_id_handler = await findPDAforIdGenerator(program.programId, "highRank")
  const codeIdRelation = await findPDAforCodeIdRelation(program.programId)
  const systemInitialization = await findPDAforSystemInitialization(program.programId)

  const result = await program.methods.createProfessor("2222", subjects)
    .accounts({
      authority: authority.publicKey,
      initializationSystemAccount: systemInitialization,
      professorIdHandler: id_generator_pda,
      highRankIdHandler: high_rank_id_handler,
      professorAccount: pda,
      codeIdSubjectRelation: codeIdRelation,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeStudent = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, subjects: Array<number>): Promise<String> => {

  const pda = await findPDAforStudent(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "student")
  const high_rank_id_handler = await findPDAforIdGenerator(program.programId, "highRank")
  const codeIdRelation = await findPDAforCodeIdRelation(program.programId)
  const systemInitialization = await findPDAforSystemInitialization(program.programId)

  const result = await program.methods.createStudent("3333", subjects)
    .accounts({
      authority: authority.publicKey,
      initializationSystemAccount: systemInitialization,
      studentIdHandler: id_generator_pda,
      highRankIdHandler: high_rank_id_handler,
      studentAccount: pda,
      codeIdSubjectRelation: codeIdRelation,
      systemProgram: anchor.web3.SystemProgram.programId
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeSystem = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair): Promise<String> => {

  const initialization_system_account = await findPDAforSystemInitialization(program.programId)
  const degree_id_generator_pda = await findPDAforIdGenerator(program.programId, "degree")
  const faculty_id_generator_pda = await findPDAforIdGenerator(program.programId, "faculty")
  const specialty_id_generator_pda = await findPDAforIdGenerator(program.programId, "specialty")
  const subject_id_generator_pda = await findPDAforIdGenerator(program.programId, "subject")
  const code_id_relation_account = await findPDAforCodeIdRelation(program.programId)
  const high_rank_account = await findPDAforHighRank(program.programId, authority.publicKey)

  const result = await program.methods.initializateNewSystem()
    .accounts({
      authority: authority.publicKey,
      initializationSystemAccount: initialization_system_account,
      highRankAccount: high_rank_account,
      codeIdSubjectRelation: code_id_relation_account,
      degreeIdHandler: degree_id_generator_pda,
      facultyIdHandler: faculty_id_generator_pda,
      specialtyIdHandler: specialty_id_generator_pda,
      subjectIdHandler: subject_id_generator_pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeFaculty = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string): Promise<String> => {

  const pda = await findPDAforFaculty(program.programId, id)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "faculty")
  const systemInitialization = await findPDAforSystemInitialization(program.programId)


  const result = await program.methods.createFaculty(name)
    .accounts({
      authority: authority.publicKey,
      initializationSystemAccount: systemInitialization,
      facultyIdHandler: id_generator_pda,
      highRank: high_rank_pda,
      facultyAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeDegree = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string, faculty_id: number): Promise<String> => {

  const pda = await findPDAforDegree(program.programId, id)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "degree")
  const faculty_id_generator_pda = await findPDAforIdGenerator(program.programId, "faculty")
  const systemInitialization = await findPDAforSystemInitialization(program.programId)


  const result = await program.methods.createDegree(name, faculty_id)
    .accounts({
      authority: authority.publicKey,
      initializationSystemAccount: systemInitialization,
      degreeIdHandler: id_generator_pda,
      facultyIdHandler: faculty_id_generator_pda,
      highRank: high_rank_pda,
      degreeAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeSpecialty = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string, degree_id: number): Promise<String> => {

  const pda = await findPDAforSpecialty(program.programId, id)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "specialty")
  const degree_id_generator_pda = await findPDAforIdGenerator(program.programId, "degree")
  const systemInitialization = await findPDAforSystemInitialization(program.programId)


  const result = await program.methods.createSpecialty(name, degree_id)
    .accounts({
      authority: authority.publicKey,
      initializationSystemAccount: systemInitialization,
      specialtyIdHandler: id_generator_pda,
      degreeIdHandler: degree_id_generator_pda,
      highRank: high_rank_pda,
      specialtyAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeSubject = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string, degree_id: number, specialty_id: number, course: any, code: number, reference:string): Promise<String> => {

  const pda = await findPDAforSubject(program.programId, id)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "subject")
  const degree_id_generator_pda = await findPDAforIdGenerator(program.programId, "degree")
  const specialty_id_generator_pda = await findPDAforIdGenerator(program.programId, "specialty")
  const code_id_relation_pda = await findPDAforCodeIdRelation(program.programId)
  const systemInitialization = await findPDAforSystemInitialization(program.programId)
  const proposalIdHandlerForSubject = await findPDAforProposalIdGenerator(program.programId, false, code)
  const professorProposalIdHandlerForSubject = await findPDAforProposalIdGenerator(program.programId, true, code)

  const result = await program.methods.createSubject(name, degree_id, specialty_id, course, code, reference)
    .accounts({
      authority: authority.publicKey,
      initializationSystemAccount: systemInitialization,
      highRank: high_rank_pda,
      subjectIdHandler: id_generator_pda,
      degreeIdHandler: degree_id_generator_pda,
      specialtyIdHandler: specialty_id_generator_pda,
      subjectAccount: pda,
      codeIdSubjectRelationAccount: code_id_relation_pda,
      proposalIdHandler: proposalIdHandlerForSubject,
      professorProposalIdHandler: professorProposalIdHandlerForSubject,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeProposalByStudent = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, title: string, content: string, subject_id: number, professor_proposal_id: number, subject_code: number): Promise<String> => {

  const pda = await findPDAforProposal(program.programId, id, subject_code)
  const student_pda = await findPDAforStudent(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforProposalIdGenerator(program.programId, false, subject_code)
  const subject_pda = await findPDAforSubject(program.programId, subject_id)
  const subject_id_generator_pda = await findPDAforIdGenerator(program.programId, "subject")
  const professor_proposal_pda = await findPDAforProfessorProposal(program.programId, professor_proposal_id, subject_code)
  const professor_proposal_id_handler = await findPDAforProposalIdGenerator(program.programId, true, subject_code)
  const code_id_relation_account = await findPDAforCodeIdRelation(program.programId)
  const systemInitialization = await findPDAforSystemInitialization(program.programId)

  const result = await program.methods.createProposalByStudent(title, content)
    .accounts({
      authority: authority.publicKey,
      initializationSystemAccount: systemInitialization,
      studentCreator: student_pda,
      proposalIdHandler: id_generator_pda,
      professorProposalIdHandler: professor_proposal_id_handler,
      subjectIdHandler: subject_id_generator_pda,
      proposalAccount: pda,
      professorProposalAccount: professor_proposal_pda,
      subjectAccount: subject_pda,
      codeIdSubjectRelation: code_id_relation_account,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeProposalByProfessor = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, title: string, content: string, subject_id: number, professor_proposal_id: number, subject_code: number): Promise<String> => {

  const pda = await findPDAforProposal(program.programId, id, subject_code)
  const professor_pda = await findPDAforProfessor(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforProposalIdGenerator(program.programId, false, subject_code)
  const subject_pda = await findPDAforSubject(program.programId, subject_id)
  const subject_id_generator_pda = await findPDAforIdGenerator(program.programId, "subject")
  const professor_proposal_pda = await findPDAforProfessorProposal(program.programId, professor_proposal_id, subject_code)
  const professor_proposal_id_handler = await findPDAforProposalIdGenerator(program.programId, true, subject_code)
  const code_id_relation_account = await findPDAforCodeIdRelation(program.programId)
  const systemInitialization = await findPDAforSystemInitialization(program.programId)



  const result = await program.methods.createProposalByProfessor(title, content)
    .accounts({
      authority: authority.publicKey,
      initializationSystemAccount: systemInitialization,
      professorCreator: professor_pda,
      proposalIdHandler: id_generator_pda,
      professorProposalIdHandler: professor_proposal_id_handler,
      subjectIdHandler: subject_id_generator_pda,
      proposalAccount: pda,
      professorProposalAccount: professor_proposal_pda,
      subjectAccount: subject_pda,
      codeIdSubjectRelation: code_id_relation_account,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const voteProposalByStudent = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, proposal_id: number, subject_id: number, profesor_proposal_id: number, vote: boolean, subject_code: number): Promise<String> => {

  const subject_pda = await findPDAforSubject(program.programId, subject_id)
  const subject_id_generator_pda = await findPDAforIdGenerator(program.programId, "subject")
  const student_pda = await findPDAforStudent(program.programId, authority.publicKey)
  const proposal_pda = await findPDAforProposal(program.programId, proposal_id, subject_code)
  const id_professor_generator_pda = await findPDAforProposalIdGenerator(program.programId, true, subject_code)
  const professor_proposal_pda = await findPDAforProfessorProposal(program.programId, profesor_proposal_id, subject_code)

  const result = await program.methods.voteProposalByStudent(vote)
    .accounts({
      authority: authority.publicKey,
      votingStudent: student_pda,
      subjectIdHandler: subject_id_generator_pda,
      proposalAccount: proposal_pda,
      subjectAccount: subject_pda,
      professorProposalIdHandler: id_professor_generator_pda,
      professorProposalAccount: professor_proposal_pda
    })
    .signers([authority])
    .rpc(confirmOptions);

  return result;
}

const updateProposalByProfessor = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, proposal_id: number, profesor_proposal_id: number, subject_code: number, subject_id: number, reference: string): Promise<String> => {

  const professor_account = await findPDAforProfessor(program.programId, authority.publicKey)
  const proposal_pda = await findPDAforProposal(program.programId, proposal_id, subject_code)
  const professor_proposal_pda = await findPDAforProfessorProposal(program.programId, profesor_proposal_id, subject_code)
  const subject_pda = await findPDAforSubject(program.programId, subject_id)


  const result = await program.methods.updateProposalByProfessor(reference)
    .accounts({
      authority: authority.publicKey,
      professorAccount: professor_account,
      proposalAccount: proposal_pda,
      professorProposalAccount: professor_proposal_pda,
      subjectAccount: subject_pda
    })
    .signers([authority])
    .rpc(confirmOptions);

  return result;
}

const updateProposalByHighRank = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, proposal_id: number, profesor_proposal_id: number, subject_code: number, subject_id: number): Promise<String> => {

  const high_rank_account = await findPDAforHighRank(program.programId, authority.publicKey)
  const proposal_pda = await findPDAforProposal(program.programId, proposal_id, subject_code)
  const professor_proposal_pda = await findPDAforProfessorProposal(program.programId, profesor_proposal_id, subject_code)
  const subject_pda = await findPDAforSubject(program.programId, subject_id)


  const result = await program.methods.updateProposalByHighRank(true)
    .accounts({
      authority: authority.publicKey,
      highRankAccount: high_rank_account,
      proposalAccount: proposal_pda,
      professorProposalAccount: professor_proposal_pda,
      subjectAccount: subject_pda
    })
    .signers([authority])
    .rpc(confirmOptions);

  return result;
}

const giveCreditToStudent = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, proposal_id: number, student_creator_public_key: anchor.web3.PublicKey, identifier_code: string, subject_code: number, subject_id: number): Promise<String> => {

  const high_rank_account = await findPDAforHighRank(program.programId, authority.publicKey)
  const proposal_account_pda = await findPDAforProposal(program.programId, proposal_id, subject_code)
  const creator_account_pda = await findPDAforStudent(program.programId, student_creator_public_key)
  const mint = await findPDAforMint(program.programId)
  const [pda, bump] = await findPDAforMintAuthority(program.programId, mint, identifier_code)
  const subject_account_pda = await findPDAforSubject(program.programId, subject_id)

  let mintAuthority: { pda: anchor.web3.PublicKey, bump: number };
  mintAuthority = { pda: pda, bump: bump };

  const associatedTokenAccount = await getAssociatedTokenAddress(mint, creator_account_pda, true);

  const result = await program.methods.giveCreditsToWinningStudent("1111", subject_code, mintAuthority.bump)
    .accounts({
      authority: authority.publicKey,
      highRankAccount: high_rank_account,
      proposalAccount: proposal_account_pda,
      creatorAccount: creator_account_pda,
      tokenAccount: associatedTokenAccount,
      mintAuthorityAccount: mintAuthority.pda,
      mint: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,

    })
    .signers([authority])
    .rpc();

  return result;

}

const deleteRejectedProposalByHighRank = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, proposal_id: number, subject_id: number, professor_proposal_id: number, subject_code: number): Promise<String> => {

  const proposal_pda = await findPDAforProposal(program.programId, proposal_id, subject_code)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const subject_pda = await findPDAforSubject(program.programId, subject_id)
  const professor_proposal_pda = await findPDAforProfessorProposal(program.programId, professor_proposal_id, subject_code)

  const result = await program.methods.deleteRejectedProposalAccount()
    .accounts({
      authority: authority.publicKey,
      highRankAccount: high_rank_pda,
      proposalAccount: proposal_pda,
      professorProposalAccount: professor_proposal_pda,
      subjectAccount: subject_pda,
    })
    .signers([authority])
    .rpc();

  return result;
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

const findPDAforIdGenerator = async (programId: anchor.web3.PublicKey, account_info: string): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode(account_info + 'IdHandler')],
    programId
  );
  return pda;
}

const findPDAforProposalIdGenerator = async (programId: anchor.web3.PublicKey, is_professor: boolean, subject_code: number): Promise<anchor.web3.PublicKey> => {

  let adding: string;
  if (is_professor) { adding = 'professorP' } else { adding = 'p' }
  let identifier: string = adding + 'roposalIdHandler';

  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode(identifier), numberToLEBytes(subject_code)],
    programId
  );
  return pda;
}

const findPDAforFaculty = async (programId: anchor.web3.PublicKey, id: Number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("faculty"), numberToLEBytes(id)],
    programId
  );
  return pda;
}

const findPDAforDegree = async (programId: anchor.web3.PublicKey, id: Number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("degree"), numberToLEBytes(id)],
    programId
  );
  return pda;
}

const findPDAforSpecialty = async (programId: anchor.web3.PublicKey, id: Number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("specialty"), numberToLEBytes(id)],
    programId
  );
  return pda;
}

const findPDAforSubject = async (programId: anchor.web3.PublicKey, id: Number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("subject"), numberToLEBytes(id)],
    programId
  );
  return pda;
}

const findPDAforProposal = async (programId: anchor.web3.PublicKey, id: Number, subject_code: number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("proposal"), numberToLEBytes(id), numberToLEBytes(subject_code)],
    programId
  );
  return pda;
}

const findPDAforProfessorProposal = async (programId: anchor.web3.PublicKey, id: Number, subject_code: number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("professorProposal"), numberToLEBytes(id), numberToLEBytes(subject_code)],
    programId
  );
  return pda;
}

const findPDAforMint = async (programId: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("creditToken")],
    programId
  );
  return pda;
}

const findPDAforCodeIdRelation = async (programId: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("codeIdSubjectRelation")],
    programId
  );
  return pda;
}

const findPDAforSystemInitialization = async (programId: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("systemInitialization")],
    programId
  );
  return pda;
}

const findPDAforMintAuthority = async (programId: anchor.web3.PublicKey, mint: anchor.web3.PublicKey, high_rank_identifier_code: string): Promise<[anchor.web3.PublicKey, number]> => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("mint_authority"), mint.toBytes(), utf8.encode(high_rank_identifier_code)],
    programId
  );
  return [pda, bump]
}

const fetchHighRankAccount = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await program.account.highRank.fetch(await findPDAforHighRank(program.programId, authority))
}

const fetchProfessorAccount = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await program.account.professor.fetch(await findPDAforProfessor(program.programId, authority))
}

const fetchFacultyAccount = async (program: Program<TeachingProjectHandler>, id: Number) => {
  return await program.account.faculty.fetch(await findPDAforFaculty(program.programId, id))
}

const fetchDegreeAccount = async (program: Program<TeachingProjectHandler>, id: Number) => {
  return await program.account.degree.fetch(await findPDAforDegree(program.programId, id))
}

const fetchSpecialtyAccount = async (program: Program<TeachingProjectHandler>, id: Number) => {
  return await program.account.specialty.fetch(await findPDAforSpecialty(program.programId, id))
}

const fetchSubjectAccount = async (program: Program<TeachingProjectHandler>, id: Number) => {
  return await program.account.subject.fetch(await findPDAforSubject(program.programId, id))
}

const fetchStudentAccount = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await program.account.student.fetch(await findPDAforStudent(program.programId, authority))
}

const fetchProposalAccount = async (program: Program<TeachingProjectHandler>, id: Number, subject_code: number) => {
  return await program.account.proposal.fetch(await findPDAforProposal(program.programId, id, subject_code))
}

const fetchProfessorProposalAccount = async (program: Program<TeachingProjectHandler>, id: number, subject_code: number) => {
  return await program.account.professorProposal.fetch(await findPDAforProfessorProposal(program.programId, id, subject_code))
}

const fetchIdAccount = async (program: Program<TeachingProjectHandler>, account_info: string) => {
  return await program.account.idHandler.fetch(await findPDAforIdGenerator(program.programId, account_info))
}

const fetchProposalIdAccount = async (program: Program<TeachingProjectHandler>, is_professor: boolean, subject_code: number) => {
  return await program.account.idHandler.fetch(await findPDAforProposalIdGenerator(program.programId, is_professor, subject_code))
}

const fetchCodeIdRelationAccount = async (program: Program<TeachingProjectHandler>) => {
  return await program.account.codeIdSubjectRelation.fetch(await findPDAforCodeIdRelation(program.programId))
}

const fetchSystemInitialization = async (program: Program<TeachingProjectHandler>) => {
  return await program.account.systemInitialization.fetch(await findPDAforSystemInitialization(program.programId))
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


function numberToLEBytes(number) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, number, true);
  const bytes = new Uint8Array(buffer);
  return bytes;
}


describe("Testing the Teaching Project Handler Smart Contract...\n\n", () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());


  // shared objects
  const program = anchor.workspace.TeachingProjectHandler as Program<TeachingProjectHandler>;
  const connection = anchor.getProvider().connection;

  let wallet1: anchor.web3.Keypair;
  let wallet2: anchor.web3.Keypair;
  let wallet3: anchor.web3.Keypair;
  let wallet4: anchor.web3.Keypair;

  let alternativeWallet: anchor.web3.Keypair;

  beforeEach(async () => {

    wallet1 = await createWallet(connection, 10); // HighRank
    wallet2 = await createWallet(connection, 40); // Professor
    wallet3 = await createWallet(connection, 10); // Student
    wallet4 = await createWallet(connection, 10);
    alternativeWallet = await createWallet(connection, 10)

  });

  it("HighRank is initializated properly", async () => {

    /*
     * Check if ID's generator for HighRank accounts exist --> 
     * If so, the smaller ID available is obtained from it 
     * If not, the new ID will be 1 since no ID's generator created implies no HighRank Account has been created previously
    */
    var idExpected = 1;
    try {
      let highRankIdGeneratorBefore = await fetchIdAccount(program, "highRank");
      idExpected = highRankIdGeneratorBefore.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
    }

  //   The new ID that should be available in the ID's generator after creating the new HighRank account
    const newIdAvailable = idExpected + 1

  //   Initializing HighRankAccount and getting the signature of the transaction
    const signature = await initializeHighRank(program, wallet1);

  //   Confirming the previous transaction in the validator node
    await connection.confirmTransaction(signature.toString())

  //   Getting all the information relative to the transaction that has been carried out
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });

    /* Getting the Return Log from the transaction information in order to get the boolean returned from the SC (Rust) function
     * 'buffer' contains the raw binary information of the return, which contains the information of the boolean returned by the tested method
    */
    const [key, data, buffer] = getReturnLog(transaction);
    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

  //   Fetching the data of the new account created through its PDA
    const newHighRankAccount = await fetchHighRankAccount(program, wallet1.publicKey);

  //   Getting the data of the HighRank ID's generator
    const highRankIdGeneratorAfterCreating = await fetchIdAccount(program, "highRank");


  //   The ID of the new HighRank Account must be equal to the idExpected param (which is the ID provided by the ID's generator for HighRank)
    expect(new anchor.BN(newHighRankAccount.id).eq(new anchor.BN(idExpected))).to.be.true;

  //   The new smaller availabled ID on the ID's generator must be equal to the param newIdAvailable (i.e. the new id available must have been incremented in +1)
    expect(new anchor.BN(highRankIdGeneratorAfterCreating.smallerIdAvailable).eq(new anchor.BN(newIdAvailable))).to.be.true;

  //   The identifierCode hash must be equal to the sha256 hash of '1111' (which is the identifier of every highRank to have certain privileges)
    assert.equal(newHighRankAccount.identifierCodeHash, CryptoJS.SHA256("1111").toString());

  //   The program must return true if everything is correct
    expect(program_return).to.be.true;

  });

  it("System is initializated properly", async () => {

    await initializeHighRank(program, wallet1);

    // Giving extra funds to the HighRank to pay the initializacion space for the accounts
    getExtraFunds(connection, 50, wallet1)
    getExtraFunds(connection, 50, wallet1)


    // Initializing the system by the HighRank owed by wallet1
    const signature = await initializeSystem(program, wallet1)

    // Confirming the previous transaction in the validator node
    await connection.confirmTransaction(signature.toString())

    // Getting all the information relative to the transaction that has been carried out
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });

    // Getting the Return Log from the transaction information in order to get the boolean returned from the SC (Rust) function

    const [key, data, buffer] = getReturnLog(transaction);
    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    // Fetching the system account and IdHandler's that have been initializated
    const newSystemAccount = await fetchSystemInitialization(program)
    const degreeIdHandler = await fetchIdAccount(program, "degree")
    const facultyIdHandler = await fetchIdAccount(program, "faculty")
    const specialtyIdHandler = await fetchIdAccount(program, "specialty")
    const subjectIdHandler = await fetchIdAccount(program, "subject")


    // The newSystemAccount must have its param system_is_initializated as 'true'
    expect(newSystemAccount.systemIsInitialized).to.be.true;

    // The new ID Handler's must have their smallerIdAvailable param with '1' value
    expect(new anchor.BN(degreeIdHandler.smallerIdAvailable).eq(new anchor.BN(1))).to.be.true;
    expect(new anchor.BN(facultyIdHandler.smallerIdAvailable).eq(new anchor.BN(1))).to.be.true;
    expect(new anchor.BN(specialtyIdHandler.smallerIdAvailable).eq(new anchor.BN(1))).to.be.true;
    expect(new anchor.BN(subjectIdHandler.smallerIdAvailable).eq(new anchor.BN(1))).to.be.true;

    // The program must return true if everything is correct
    expect(program_return).to.be.true;

  });

  it("Professor is initializated properly", async () => {

    /*
    * Check if ID's generator for Professor accounts exist --> 
    * If so, the smaller ID available is obtained from it 
    * If not, the new ID will be 0 since no ID's generator created implies no Professor Acccount has been created previously
   */
    var idExpected = 1;
    try {
      let professorIdGeneratorBefore = await fetchIdAccount(program, "professor");
      idExpected = professorIdGeneratorBefore.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
    }

    /*
    * Check if Code-Id Relation account exist --> 
    * If not, the account that stores the relation must be created
   */

    await getExtraFunds(connection, 50, wallet2);
    await getExtraFunds(connection, 50, wallet2);
    await getExtraFunds(connection, 50, wallet2);
    await getExtraFunds(connection, 50, wallet2);
    await getExtraFunds(connection, 50, wallet2);
    await getExtraFunds(connection, 50, wallet2);


    // Initializing ProfessorAccount and getting the signature of the transaction
    const signature = await initializeProfessor(program, wallet2, [43222, 43212]);

    // Confirming the previous transaction in the validator node
    await connection.confirmTransaction(signature.toString())

    // Getting all the information relative to the transaction that has been carried out
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });

    /* Getting the Return Log from the transaction information in order to get the boolean returned from the SC (Rust) function
     * 'buffer' contains the raw binary information of the return, which contains the information of the boolean returned by the tested method
    */
    const [key, data, buffer] = getReturnLog(transaction);
    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    // Fetching the data of the new account created through its PDA
    const newProfessorAccount = await fetchProfessorAccount(program, wallet2.publicKey);

    // The ID of the new Professor Account must be equal to the idExpected param (which is the ID provided by the ID's generator for Professor)
    expect(new anchor.BN(newProfessorAccount.id).eq(new anchor.BN(idExpected))).to.be.true;

    // The identifierCode hash must be equal to the sha256 hash of '2222' (which is the identifier of every Professor to have certain privileges)
    assert.equal(newProfessorAccount.identifierCodeHash, CryptoJS.SHA256("2222").toString());

    // The subjects that the professor belongs to must be equal to the ones passed by parameter 
    // 'deep.equal' is used to compare the actual content of the objects and not the memory reference (which will be always false since the references cannot be the same)'deep.equal' is used to compare the actual content of the objects and not the memory reference (which will be always false since the references cannot be the same)
    expect(newProfessorAccount.subjects).to.deep.equal([43222, 43212]);

    // The program must return true if everything is correct
    expect(program_return).to.be.true;

  });

  it("Reinitializing the same professor with different ID...", async () => {

    /**
     * Trying to initialize a new Professor Account for the same wallet --> 
     * Since the PDA (address) is calculated through the wallet's PublicKey, the PDA will result in the same than the previous initialization
     * This will raise up an error due to the constraint init, which cannot init an account with an address which is already initializated
     */

    await initializeProfessor(program, wallet2, [4322, 4312]);

    try {
      await initializeProfessor(program, wallet2, [4322, 4312]);
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "custom program error: 0x0"); //0x0 is the error for initializing an already initializated account
      return;
    }

    // The test is expecting an error, so it will fail if an error is not raised
    assert.fail("Expected an error to be thrown");

  });

  it("Student is initializated properly", async () => {

    /*
    * Check if ID's generator for Student accounts exist --> 
    * If so, the smaller ID available is obtained from it 
    * If not, the new ID will be 0 since no ID's generator created implies no Professor Acccount has been created previously
   */
    var idExpected = 1;
    try {
      let studentIdGeneratorBefore = await fetchIdAccount(program, "student");
      idExpected = studentIdGeneratorBefore.smallerIdAvailable;
    } catch (err) {
      assert.instanceOf(err, Error);
    }

    // The new ID that should be available in the ID's generator after creating the new Professor account
    const newIdAvailable = idExpected + 1

    // Initializing StudentAccount and getting the signature of the transaction
    const signature = await initializeStudent(program, wallet3, [43222, 43212, 43123, 43124, 43125, 43126, 43127, 43128]);

    // Confirming the previous transaction in the validator node
    await connection.confirmTransaction(signature.toString())

    // Getting all the information relative to the transaction that has been carried out
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });

    /* Getting the Return Log from the transaction information in order to get the boolean returned from the SC (Rust) function
     * 'buffer' contains the raw binary information of the return, which contains the information of the boolean returned by the tested method
    */
    const [key, data, buffer] = getReturnLog(transaction);
    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    // Fetching the data of the new account created through its PDA
    const newStudentAccount = await fetchStudentAccount(program, wallet3.publicKey);

    // Getting the data of the Student ID's generator
    const studentIdGeneratorAfterCreating = await fetchIdAccount(program, "student");

    // The ID of the new Student Account must be equal to the idExpected param (which is the ID provided by the ID's generator for Students)
    expect(new anchor.BN(newStudentAccount.id).eq(new anchor.BN(idExpected))).to.be.true;

    // The new smaller availabled ID on the ID's generator must be equal to the param newIdAvailable (i.e. the new id available must have been incremented in +1)
    expect(new anchor.BN(studentIdGeneratorAfterCreating.smallerIdAvailable).eq(new anchor.BN(newIdAvailable))).to.be.true;

    // The identifierCode hash must be equal to the sha256 hash of '1111' (which is the identifier of every highRank to have certain privileges)
    assert.equal(newStudentAccount.identifierCodeHash, CryptoJS.SHA256("3333").toString());

    expect(newStudentAccount.subjects).to.deep.equal([43222, 43212, 43123, 43124, 43125, 43126, 43127, 43128]);

    // The program must return true if everything is correct
    expect(program_return).to.be.true;
  });

  it("Faculty is properly initializated", async () => {

    // Initializating highRank and giving extra funds (SOL) to wallet1 (which is allowed by a HighRank user)
    await initializeHighRank(program, wallet1)
    getExtraFunds(connection, 50, wallet1)

    var idExpected = 1;

    // Getting the ID generator that has been previously initializated by a HighRank
    const account = await fetchIdAccount(program, "faculty");
    idExpected = account.smallerIdAvailable

    // Initializing FacultyAccount and getting the signature of the transaction
    const signature = await initializeFaculty(program, wallet1, idExpected, "Asignatura de prueba")

    // Confirming the previous transaction in the validator node
    await connection.confirmTransaction(signature.toString())

    // Getting all the information relative to the transaction that has been carried out
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });

    /* Getting the Return Log from the transaction information in order to get the boolean returned from the SC (Rust) function
     * 'buffer' contains the raw binary information of the return, which contains the information of the boolean returned by the tested method
    */
    const [key, data, buffer] = getReturnLog(transaction);
    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    // Fetching the data of the new account created through its PDA
    const newFacultyAccount = await fetchFacultyAccount(program, idExpected);

    // Getting the data of the Faculty ID's generator
    const FacultyIdGeneratorAccount = await fetchIdAccount(program, "faculty");

    // The ID of the new Faculty Account must be equal to the idExpected param (which is the ID provided by the ID's generator for Faculty)
    expect(new anchor.BN(newFacultyAccount.id).eq(new anchor.BN(idExpected))).to.be.true;

    // The new smaller availabled ID on the ID's generator must be equal to 'idExpected' incremented in +1)
    expect(new anchor.BN(FacultyIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;

    // The program must return true if everything is correct
    expect(program_return).to.be.true;
  });

  it("Degree is properly initializated", async () => {

    await initializeHighRank(program, wallet1);
    getExtraFunds(connection, 50, wallet1);

    var idExpected = 1;


    const account = await fetchIdAccount(program, "degree");
    idExpected = account.smallerIdAvailable

    const signature = await initializeDegree(program, wallet1, idExpected, "Grado de prueba perteneciente a Facultad con id=0", 1)
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);

    const newDegreeAccount = await fetchDegreeAccount(program, idExpected);
    const degreeIdGeneratorAccount = await fetchIdAccount(program, "degree");

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    expect(new anchor.BN(newDegreeAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(degreeIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(program_return).to.be.true;

  });

  it("Specialty is properly initializated", async () => {

    await initializeHighRank(program, wallet1)
    getExtraFunds(connection, 50, wallet1) //wallet1 is allowed by a HighRank

    var idExpected = 1;


    const account = await fetchIdAccount(program, "specialty");
    idExpected = account.smallerIdAvailable


    const signature = await initializeSpecialty(program, wallet1, idExpected, "Especialidad de prueba", 1)
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);

    const newSpecialtyAccount = await fetchSpecialtyAccount(program, idExpected);
    const degreeIdGeneratorAccount = await fetchIdAccount(program, "specialty");

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);


    expect(new anchor.BN(newSpecialtyAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(degreeIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(program_return).to.be.true;

  });

  it("Specialty with incorrect ID trying to be initializated", async () => {

    await initializeHighRank(program, wallet1);
    getExtraFunds(connection, 50, wallet1);
    var idExpected = 1;

    const account = await fetchIdAccount(program, "specialty");
    idExpected = account.smallerIdAvailable

    /*
     * Account cannot be created since the provided ID is invalid (less than 0)
     * One of the constraints in the SC must raise an error, which is expected to be an instance of Error 
     * The error must also contain "A raw constraint was violated" as part of the message
    */
    try {
      await initializeSpecialty(program, wallet1, idExpected, "Especialidad de prueba", -1)
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "A raw constraint was violated");
      return;
    }

    assert.fail("Expected an error to be thrown");

  });

  it("Subject is properly initializated", async () => {

    await initializeHighRank(program, wallet1)
    getExtraFunds(connection, 50, wallet1) //wallet1 is allowed by a HighRank

    // Fetching the codeIdSubject relation before carrying out the test 
    const codeIdSubjectRelationBefore = await fetchCodeIdRelationAccount(program);

    // creating a new aux professor
    const auxSignature = await initializeProfessor(program, wallet4, [43111, 44323]);
    await connection.confirmTransaction(auxSignature.toString())

    getExtraFunds(connection, 50, wallet1) //wallet1 is allowed by a HighRank
    var idExpected = 1;


    const account = await fetchIdAccount(program, "subject");
    idExpected = account.smallerIdAvailable

    /* Due to a previous test --> there will always be a professor with ID '0' 
     * The aux professor's id is passed as part of the array of professors' id via 'auxProfessorAccount.id'
    */
    const signature = await initializeSubject(program, wallet1, idExpected, "Especialidad de prueba", 1, 1, { first: {} }, 43111, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);

    const newSubjectAccount = await fetchSubjectAccount(program, idExpected);
    const subjectIdGeneratorAccount = await fetchIdAccount(program, "subject");

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    expect(new anchor.BN(newSubjectAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(subjectIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(new anchor.BN(newSubjectAccount.degreeId).eq(new anchor.BN(1))).to.be.true;

    assert.equal("QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs", newSubjectAccount.teachingProjectReference)

    // Checking if the course is equal to SubjectCourse::First (enum in Rust)
    expect(newSubjectAccount.course).to.deep.equal({ first: {} });

    // The program return data must be the boolean 'true'
    expect(program_return).to.be.true;

  });

  it("Subject is initializated with incorrect code", async () => {

    await initializeHighRank(program, wallet1)

    getExtraFunds(connection, 50, wallet1) //wallet1 is allowed by a HighRank
    var idExpected = 1;


    const account = await fetchIdAccount(program, "subject");
    idExpected = account.smallerIdAvailable


    try {
      await initializeSubject(program, wallet1, idExpected, "Especialidad de prueba", 1, 1, { first: {} }, -43112, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "RangeError [ERR_OUT_OF_RANGE]");
      return;
    }

    assert.fail("Expected an error to be thrown");

  });

  /*
  * This two next tests will only run properly once (since it will initializate the subject 43500, which cannot be created again) --> 
  * For this test to pass again, validator node must be restarted with command 'solana-test-validator -r'
  */

  it("Proposal is created properly by Student", async () => {

    await initializeHighRank(program, wallet1);

    // Initializing new subject and fetching it

    var subjectId = 1;
    const subjectCode = 43600;


    const subjectIdAccount = await fetchIdAccount(program, "subject");
    subjectId = subjectIdAccount.smallerIdAvailable



    const subjectSignature = await initializeSubject(program, wallet1, subjectId, "Asignatura de prueba", 1, 1, { second: {} }, subjectCode, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(subjectSignature.toString())

    const newSubjectAccount = await fetchSubjectAccount(program, subjectId);
    const codeIdSubjectRelationAfter = await fetchCodeIdRelationAccount(program);

    /*
    * Using logging on console to verify some aspects of the codeIdRelation that are difficult to check via tests
    */

    console.log(newSubjectAccount)
    console.log(codeIdSubjectRelationAfter.keyId)
    console.log(codeIdSubjectRelationAfter.codeValue)

    // Creating new student

    await initializeStudent(program, wallet3, [subjectCode]);
    getExtraFunds(connection, 50, wallet3) // wallet3 is allowed by a Student

    // Creating new proposal

    var idExpected = 1;
    var professorProposalIdExpected = 1;


    const account = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    idExpected = account.smallerIdAvailable


    // Getting the professorProposal's id from professorProposalIdGenerator and if it does not exist, the ID expected (and used for the calculation of PDA) must be 0
    try {
      const account = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
      professorProposalIdExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta de prueba", "Desarollo o contenido de la propuesta de prueba", newSubjectAccount.id, professorProposalIdExpected, newSubjectAccount.code)
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);

    const newProposalAccount = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);
    const proposalIdGeneratorAccount = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    const studentAccount = await fetchStudentAccount(program, wallet3.publicKey)
    const subjectAccount = await fetchSubjectAccount(program, newProposalAccount.subjectId)

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    expect(new anchor.BN(newProposalAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(proposalIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;

    // Checking that the subjectId of the proposal is correct (the subject that the proposal is derived from)
    expect(new anchor.BN(newProposalAccount.subjectId).eq(new anchor.BN(subjectAccount.id))).to.be.true;

    // The ending_timestamp field must be equal to the publishingTimestamp plus 1 month (duration of the proposal) which is equal to 2592000 seconds in Unix Timestamp format
    expect(Number(newProposalAccount.publishingTimestamp) + 2592000).eq(Number(newProposalAccount.endingTimestamp));

    // The ID of the creator (sender) of the transaction must be properly registered in the field creatorId in the proposal
    expect(new anchor.BN(studentAccount.id).eq(new anchor.BN(newProposalAccount.creatorId))).to.be.true;

    // The expected votes (as established in the SC) must be equal to the amount of professors and students that owe the subject (1 students and 0 teachers + 20 extra votes expected)
    // 20 votes are added in order to bear in mind the votes of professionals that are not registered in the subjects neither as students nor as professors
    expect(new anchor.BN(newProposalAccount.expectedVotes).eq(new anchor.BN(21))).to.be.true;

    expect(program_return).to.be.true;
  });

  it("Proposal is created properly by Professor", async () => {

    await initializeHighRank(program, wallet1);

    // Initializing new subject and fetching it

    var subjectId = 1;
    const subjectCode = 43700;


    const subjectIdAccount = await fetchIdAccount(program, "subject");
    subjectId = subjectIdAccount.smallerIdAvailable



    const subjectSignature = await initializeSubject(program, wallet1, subjectId, "Asignatura de prueba", 1, 1, { second: {} }, subjectCode, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(subjectSignature.toString())

    const newSubjectAccount = await fetchSubjectAccount(program, subjectId);
    const codeIdSubjectRelationAfter = await fetchCodeIdRelationAccount(program);

    // Creating new professor

    await initializeProfessor(program, wallet2, [subjectCode]);
    getExtraFunds(connection, 50, wallet2) 

    // Creating new proposal

    var correct = true;
    var idExpected = 1;
    var professorProposalIdExpected = 1;


    const account = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    idExpected = account.smallerIdAvailable



    // Getting the professorProposal's id from professorProposalIdGenerator and if it does not exist, the ID expected (and used for the calculation of PDA) must be 0
    try {
      const account = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
      professorProposalIdExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    const signature = await initializeProposalByProfessor(program, wallet2, idExpected, "Propuesta de prueba", "Desarollo o contenido de la propuesta de prueba", newSubjectAccount.id, professorProposalIdExpected, newSubjectAccount.code)
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);

    const newProposalAccount = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);
    const proposalIdGeneratorAccount = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    const professorAccount = await fetchProfessorAccount(program, wallet2.publicKey)

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    expect(new anchor.BN(newProposalAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(proposalIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;

    // Checking that the subjectId of the proposal is correct (the subject that the proposal is derived from)
    expect(new anchor.BN(newProposalAccount.subjectId).eq(new anchor.BN(subjectId))).to.be.true;

    // The ending_timestamp field must be equal to the publishingTimestamp plus 1 month (duration of the proposal) which is equal to 2592000 seconds in Unix Timestamp format
    expect(Number(newProposalAccount.publishingTimestamp) + 2592000).eq(Number(newProposalAccount.endingTimestamp));

    // The ID of the creator (sender) of the transaction must be properly registered in the field creatorId in the proposal
    expect(new anchor.BN(professorAccount.id).eq(new anchor.BN(newProposalAccount.creatorId))).to.be.true;

    // The expected votes (as established in the SC) must be equal to the amount of professors and students that owe the subject (1 students and 0 teachers + 20 extra votes expected)
    // 20 votes are added in order to bear in mind the votes of professionals that are not registered in the subjects neither as students nor as professors
    expect(new anchor.BN(newProposalAccount.expectedVotes).eq(new anchor.BN(21))).to.be.true;

    expect(program_return).to.be.true;
  });

  it("Proposal is properly voted by a student", async () => {

    // INITIALIZATING HIGH RANK 
    await initializeHighRank(program, wallet1);

    // INITIALIZATING A SUBJECT

    var subjectId = 1;
    const subjectCode = 43123;


    const subjectAccount = await fetchIdAccount(program, "subject");
    subjectId = subjectAccount.smallerIdAvailable


    const subjectSignature = await initializeSubject(program, wallet1, subjectId, "Asignatura de prueba", 1, 1, { second: {} }, subjectCode, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(subjectSignature.toString())

    const newSubjectAccount = await fetchSubjectAccount(program, subjectId);


    // INITIALIZATING STUDENT

    await initializeStudent(program, wallet3, [subjectCode]);
    getExtraFunds(connection, 50, wallet3)

    var idExpected = 1;
    var professorProposalIdExpected = 1;


    // CREATING NEW PROPOSAL (just exactly the previous tests)

    const account = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    idExpected = account.smallerIdAvailable




    try {
      const account = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
      professorProposalIdExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", newSubjectAccount.id, professorProposalIdExpected, newSubjectAccount.code)
    await connection.confirmTransaction(signature.toString())


    // Fetching the proposal account before voting
    const proposalAccount = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);


    // VOTING THE PROPOSAL (by the creator)
    const vote_signature = await voteProposalByStudent(program, wallet3, Number(proposalAccount.id), Number(proposalAccount.subjectId), Number(proposalAccount.associatedProfessorProposalId), true, newSubjectAccount.code)
    await connection.confirmTransaction(vote_signature.toString())
    const transaction = await connection.getTransaction(vote_signature.toString(), { commitment: "confirmed" });


    // Getting the Program Return
    const [key, data, buffer] = getReturnLog(transaction);
    const program_return = new Borsh.BinaryReader(buffer).readString();

    // Fetching the proposal account after voting
    const proposalAccountAfterVoting = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);

    // The creator is voting in favor of the proposal, so the supporting_votes field must be incremented in +1
    expect(new anchor.BN(proposalAccount.supportingVotes + 1).eq(new anchor.BN(proposalAccountAfterVoting.supportingVotes))).to.be.true;

    // The against_votes field must remain equal (i.e. with value 0)
    expect(new anchor.BN(proposalAccount.againstVotes).eq(new anchor.BN(proposalAccountAfterVoting.againstVotes))).to.be.true;

    // After voting, the votation must continue being 'VotationInProgress'
    expect(program_return).to.deep.equal("VotationInProgress")

  });

  it("Proposal trying to be voted by the same student (the creator, in this case)", async () => {

    // INITIALIZATING HIGH RANK 
    await initializeHighRank(program, wallet1);

    // INITIALIZATING A SUBJECT

    var subjectId = 1;
    const subjectCode = 44230;


    const subjectIdAccount = await fetchIdAccount(program, "subject");
    subjectId = subjectIdAccount.smallerIdAvailable


    const subjectSignature = await initializeSubject(program, wallet1, subjectId, "Asignatura de prueba", 1, 1, { second: {} }, subjectCode, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(subjectSignature.toString())

    const newSubjectAccount = await fetchSubjectAccount(program, subjectId);


    // INITIALIZATING STUDENT

    await initializeStudent(program, wallet3, [subjectCode]);
    getExtraFunds(connection, 50, wallet3)

    var idExpected = 1;
    var professorProposalIdExpected = 1;


    // CREATING NEW PROPOSAL (just exactly the previous tests)

    const account = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    idExpected = account.smallerIdAvailable

    try {
      const account = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
      professorProposalIdExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    // CREATING PROPOSAL 

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", newSubjectAccount.id, professorProposalIdExpected, newSubjectAccount.code)
    await connection.confirmTransaction(signature.toString())


    // Fetching the proposal account before voting
    const proposalAccount = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);


    // VOTING THE PROPOSAL (by the creator)
    const vote_signature = await voteProposalByStudent(program, wallet3, Number(proposalAccount.id), Number(proposalAccount.subjectId), Number(proposalAccount.associatedProfessorProposalId), true, newSubjectAccount.code)
    await connection.confirmTransaction(vote_signature.toString())

    try {
      await voteProposalByStudent(program, wallet3, Number(proposalAccount.id), Number(proposalAccount.subjectId), Number(proposalAccount.associatedProfessorProposalId), false, newSubjectAccount.code)

    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "UserHasAlreadyVoted");
      return
    }

    assert.fail("Expected an error to be thrown");

  });

  it("Proposal is trying to be created by an student that does not belong to it", async () => {

    // INITIALIZATING HIGH RANK 
    await initializeHighRank(program, wallet1);

    // INITIALIZATING A SUBJECT

    var subjectId = 1;
    const subjectCode = 18000;


    const subjectIdAccount = await fetchIdAccount(program, "subject");
    subjectId = subjectIdAccount.smallerIdAvailable


    const subjectSignature = await initializeSubject(program, wallet1, subjectId, "Asignatura de prueba", 1, 1, { second: {} }, subjectCode, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(subjectSignature.toString())

    const newSubjectAccount = await fetchSubjectAccount(program, subjectId);


    // INITIALIZATING STUDENT

    await initializeStudent(program, wallet3, [subjectCode + 3]);
    getExtraFunds(connection, 50, wallet3)
    var idExpected = 1;
    var professorProposalIdExpected = 1;


    // CREATING NEW PROPOSAL (just exactly the previous tests)

    const account = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    idExpected = account.smallerIdAvailable


    try {
      const account = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
      professorProposalIdExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    // CREATING PROPOSAL 


    try {
      const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", newSubjectAccount.id, professorProposalIdExpected, newSubjectAccount.code)
      await connection.confirmTransaction(signature.toString())
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "UserDoesNotBelongToTheSubject");
    }
  });

  it("Proposal is trying to be voted by an student that does not allow to it", async () => {

    // INITIALIZATING HIGH RANK 
    await initializeHighRank(program, wallet1);

    // INITIALIZATING A SUBJECT

    var subjectId = 1;

    const subjectCode = 43193;


    const subjectIdAccount = await fetchIdAccount(program, "subject");
    subjectId = subjectIdAccount.smallerIdAvailable


    const subjectSignature = await initializeSubject(program, wallet1, subjectId, "Asignatura de prueba", 1, 1, { second: {} }, subjectCode, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(subjectSignature.toString())

    const newSubjectAccount = await fetchSubjectAccount(program, subjectId);


    // INITIALIZATING STUDENT

    await initializeStudent(program, wallet3, [subjectCode]);
    getExtraFunds(connection, 50, wallet3)

    var idExpected = 1;
    var professorProposalIdExpected = 1;


    // CREATING NEW PROPOSAL (just exactly the previous tests)

    const account = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    idExpected = account.smallerIdAvailable

    try {
      const account = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
      professorProposalIdExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    // CREATING PROPOSAL 

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", newSubjectAccount.id, professorProposalIdExpected, newSubjectAccount.code)
    await connection.confirmTransaction(signature.toString())


    // Fetching the proposal account before voting
    const proposalAccount = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);

    // INITIALIZING VOTING STUDENT
    await initializeStudent(program, alternativeWallet, [])

    // VOTING THE PROPOSAL (by the creator)
    try {
      await voteProposalByStudent(program, alternativeWallet, Number(proposalAccount.id), Number(proposalAccount.subjectId), Number(proposalAccount.associatedProfessorProposalId), true, newSubjectAccount.code)
      await connection.confirmTransaction(signature.toString())
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "UserDoesNotBelongToTheSubject");
    }
  });


    //--------------------------TEST THAT ONLY WORK BY MODIFYING CERTAIN CONDITIONS OF THE SMART CONTRACT-----------------------//


  /*
    Condition modified: set maximum of votes as the minimum (expected_votes) instead of 2500
  */

  it("Reaching the number of expecting votes while voting true ", async () => {

    // INITIALIZATING HIGH RANK 
    await initializeHighRank(program, wallet1);

    // INITIALIZATING A SUBJECT

    var subjectId = 1;
    const subjectCode = 50003;


    const subjectIdAccount = await fetchIdAccount(program, "subject");
    subjectId = subjectIdAccount.smallerIdAvailable


    const subjectSignature = await initializeSubject(program, wallet1, subjectId, "Asignatura de prueba", 1, 1, { second: {} }, subjectCode, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(subjectSignature.toString())

    const newSubjectAccount = await fetchSubjectAccount(program, subjectId)

    // INITIALIZATING STUDENT

    await initializeStudent(program, wallet3, [subjectCode]);
    getExtraFunds(connection, 50, wallet3)

    var idExpected = 1;
    var professorProposalIdExpected = 1;


    // CREATING NEW PROPOSAL (just exactly the previous tests)

    const account = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    idExpected = account.smallerIdAvailable



    try {
      const account = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
      professorProposalIdExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", newSubjectAccount.id, professorProposalIdExpected, newSubjectAccount.code)
    await connection.confirmTransaction(signature.toString())

    // VOTING TRUE BY DIFFERENT STUDENTS 

    // Fetching the proposal account before voting
    const proposalAccountBeforeVoting = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);

    const number_of_votes_expected = 20 // Must be set to 20 on SC (MAXIMUM_PARTICIPATION const)

    // Subscribing to the event emitted when the votation is finished and accepted 
    let event_emitted: any;
    program.addEventListener("NewProfessorProposalCreated", (event, _slot, _signature) => { event_emitted = event })

    // We create students to vote in favor until the number of votes expected is reached and the votation is forced to finalize
    var vote_signature: String;

    for (var i: number = 0; i < number_of_votes_expected; i++) {
      alternativeWallet = await createWallet(connection, 10);
      await initializeStudent(program, alternativeWallet, [subjectCode])
      vote_signature = await voteProposalByStudent(program, alternativeWallet, proposalAccountBeforeVoting.id, proposalAccountBeforeVoting.subjectId, proposalAccountBeforeVoting.associatedProfessorProposalId, true, newSubjectAccount.code)
      await connection.confirmTransaction(vote_signature.toString())

    }

    // Fetching the proposal account after voting
    const proposalAccountAfterVoting = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);

    // The Creator's Public Key must be equal to the Wallet3's (Student) PublicKey
    expect(proposalAccountAfterVoting.creatorPublicKey.toString()).to.deep.equal(wallet3.publicKey.toString())

    expect(new anchor.BN(proposalAccountAfterVoting.againstVotes + proposalAccountAfterVoting.supportingVotes).eq(new anchor.BN(number_of_votes_expected))).to.be.true;

    // Getting the Program Return
    const lastVotingTransaction = await connection.getTransaction(vote_signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(lastVotingTransaction);
    const program_return = new Borsh.BinaryReader(buffer).readString();

    // After completing the voting process, the votation must continue being 'WaitingForTeacher' since all students voted 'true' (supporting the proposal)
    expect(program_return).to.deep.equal("WaitingForTeacher")

    // fetching the professorProposalIdHandler and the professorProposal
    const professorProposalIdHandler = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
    const idExpectedFromProfessorProposal = Number(professorProposalIdHandler.smallerIdAvailable - 1)

    const professorProposal = await fetchProfessorProposalAccount(program, proposalAccountAfterVoting.associatedProfessorProposalId, newSubjectAccount.code)

    // Checking the result emitted is correct
    expect(event_emitted).to.deep.equal({ proposalId: proposalAccountAfterVoting.id, professorProposalId: idExpectedFromProfessorProposal })

    // Evaluating the professorProposal is properly initializated 
    expect(new anchor.BN(proposalAccountAfterVoting.associatedProfessorProposalId).eq(new anchor.BN(professorProposal.id))).to.be.true;
    expect(professorProposal.state).to.deep.equal({ pending: {} });

  });


  it("Forcing the test to finalize (reaching the number of expecting votes) and tokens -credits- are properly delivered ", async () => {

    // INITIALIZATING HIGH RANK 
    await initializeHighRank(program, wallet1);

    // INITIALIZATING A SUBJECT

    var subjectId = 1;
    const subjectCode = 80003;


    const subjectIdAccount = await fetchIdAccount(program, "subject");
    subjectId = subjectIdAccount.smallerIdAvailable


    const subjectSignature = await initializeSubject(program, wallet1, subjectId, "Asignatura de prueba", 1, 1, { second: {} }, subjectCode, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(subjectSignature.toString())

    const newSubjectAccount = await fetchSubjectAccount(program, subjectId)

    // INITIALIZATING STUDENT

    await initializeStudent(program, wallet3, [subjectCode]);
    getExtraFunds(connection, 50, wallet3)
    var idExpected = 1;
    var professorProposalIdExpected = 1;


    // CREATING NEW PROPOSAL (just exactly the previous tests)

    const account = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    idExpected = account.smallerIdAvailable



    try {
      const account = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
      professorProposalIdExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", newSubjectAccount.id, professorProposalIdExpected, newSubjectAccount.code)
    await connection.confirmTransaction(signature.toString())

    // VOTING TRUE BY DIFFERENT STUDENTS 

    // Fetching the proposal account before voting
    const proposalAccountBeforeVoting = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);

    const number_of_votes_expected = 20 // Must be set to 20 on SC (MAXIMUM_PARTICIPATION const)

    // Subscribing to the event emitted when the votation is finished and accepted 
    let event_emitted: any;
    program.addEventListener("NewProfessorProposalCreated", (event, _slot, _signature) => { event_emitted = event })

    // We create students to vote in favor until the number of votes expected is reached and the votation is forced to finalize
    var vote_signature: String;

    for (var i: number = 0; i < number_of_votes_expected; i++) {
      alternativeWallet = await createWallet(connection, 10);
      await initializeStudent(program, alternativeWallet, [subjectCode])
      vote_signature = await voteProposalByStudent(program, alternativeWallet, proposalAccountBeforeVoting.id, proposalAccountBeforeVoting.subjectId, proposalAccountBeforeVoting.associatedProfessorProposalId, true, newSubjectAccount.code)
      await connection.confirmTransaction(vote_signature.toString())

    }

    // Fetching the proposal account after voting
    const proposalAccountAfterVoting = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);

    expect(new anchor.BN(proposalAccountAfterVoting.againstVotes + proposalAccountAfterVoting.supportingVotes).eq(new anchor.BN(number_of_votes_expected))).to.be.true;

    // Getting the Program Return
    const lastVotingTransaction = await connection.getTransaction(vote_signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(lastVotingTransaction);
    const program_return = new Borsh.BinaryReader(buffer).readString();

    // After completing the voting process, the votation must continue being 'WaitingForTeacher' since all students voted 'true' (supporting the proposal)
    expect(program_return).to.deep.equal("WaitingForTeacher")

    // fetching the professorProposalIdHandler and the professorProposal
    const professorProposalIdHandler = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
    const idExpectedFromProfessorProposal = Number(professorProposalIdHandler.smallerIdAvailable - 1)

    const professorProposal = await fetchProfessorProposalAccount(program, proposalAccountAfterVoting.associatedProfessorProposalId, newSubjectAccount.code)

    // Checking the result emitted is correct
    expect(event_emitted).to.deep.equal({ proposalId: proposalAccountAfterVoting.id, professorProposalId: idExpectedFromProfessorProposal })

    // Evaluating the professorProposal is properly initializated 
    expect(new anchor.BN(proposalAccountAfterVoting.associatedProfessorProposalId).eq(new anchor.BN(professorProposal.id))).to.be.true;
    expect(professorProposal.state).to.deep.equal({ pending: {} });

    // Updating Proposal by Professor
    await initializeProfessor(program, wallet2, [subjectCode])
    await updateProposalByProfessor(program, wallet2, proposalAccountAfterVoting.id, professorProposal.id, newSubjectAccount.code, newSubjectAccount.id, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")

    const proposalAccountAfterProfessorUpdating = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);
    const professorProposalAfterProfessorUpdating = await fetchProfessorProposalAccount(program, proposalAccountAfterVoting.associatedProfessorProposalId, newSubjectAccount.code)

    expect(professorProposalAfterProfessorUpdating.state).to.deep.equal({ complete: {} });
    expect(proposalAccountAfterProfessorUpdating.state).to.deep.equal({ waitingForHighRank: {} });

    // Updating Proposal by HighRank
    await updateProposalByHighRank(program, wallet1, proposalAccountAfterVoting.id, professorProposal.id, newSubjectAccount.code, newSubjectAccount.id)

    const proposalAccountAfterHighRankUpdating = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);
    const professorProposalAfterHighRankUpdating = await fetchProfessorProposalAccount(program, proposalAccountAfterVoting.associatedProfessorProposalId, newSubjectAccount.code)

    expect(professorProposalAfterHighRankUpdating.state).to.deep.equal({ complete: {} });
    expect(proposalAccountAfterHighRankUpdating.state).to.deep.equal({ accepted: {} });


    const creator_account_pda = await findPDAforStudent(program.programId, proposalAccountAfterHighRankUpdating.creatorPublicKey)
    const mint = await findPDAforMint(program.programId)
    const studentAssociatedTokenAccount = await getAssociatedTokenAddress(mint, creator_account_pda, true);

    var balanceBeforeGiving: number = 0

    try {
      const tokenAccountBuyerBefore = await getAccount(connection, studentAssociatedTokenAccount);
      balanceBeforeGiving = Number(tokenAccountBuyerBefore.amount)
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "TokenAccountNotFoundError");
    }

    await giveCreditToStudent(program, wallet1, proposalAccountAfterHighRankUpdating.id, proposalAccountAfterHighRankUpdating.creatorPublicKey, "1111", newSubjectAccount.code, newSubjectAccount.id)

    const tokenAccountBuyerAfter = await getAccount(connection, studentAssociatedTokenAccount);
    const balanceAfterGiving = Number(tokenAccountBuyerAfter.amount);

    console.log(balanceAfterGiving)
    console.log(balanceBeforeGiving)
    expect(new anchor.BN(balanceAfterGiving).eq(new anchor.BN(balanceBeforeGiving + 10))).to.be.true;

  });


  it("Forcing the test to finalize (reaching the number of expecting votes) and voting false", async () => {

    // INITIALIZATING HIGH RANK 
    await initializeHighRank(program, wallet1);

    // INITIALIZATING A SUBJECT

    var subjectId = 1;
    const subjectCode = 78003;


    const subjectIdAccount = await fetchIdAccount(program, "subject");
    subjectId = subjectIdAccount.smallerIdAvailable


    const subjectSignature = await initializeSubject(program, wallet1, subjectId, "Asignatura de prueba", 1, 1, { second: {} }, subjectCode, "QmPRKpTKznUt6sU8yjYBwWaECVBVBF8nMiL77W2hkhVsQs")
    await connection.confirmTransaction(subjectSignature.toString())

    const newSubjectAccount = await fetchSubjectAccount(program, subjectId)

    // INITIALIZATING STUDENT

    await initializeStudent(program, wallet3, [subjectCode]);
    getExtraFunds(connection, 50, wallet3)
    var idExpected = 1;
    var professorProposalIdExpected = 1;


    // CREATING NEW PROPOSAL (just exactly the previous tests)

    const account = await fetchProposalIdAccount(program, false, newSubjectAccount.code)
    idExpected = account.smallerIdAvailable


    try {
      const account = await fetchProposalIdAccount(program, true, newSubjectAccount.code)
      professorProposalIdExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", newSubjectAccount.id, professorProposalIdExpected, newSubjectAccount.code)
    await connection.confirmTransaction(signature.toString())

    // VOTING TRUE BY DIFFERENT STUDENTS 

    // Fetching the proposal account before voting
    const proposalAccountBeforeVoting = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);

    const number_of_votes_expected = 20 // Must be set to 20 on SC (MAXIMUM_PARTICIPATION const)

    // We create students to vote in favor until the number of votes expected is reached and the votation is forced to finalize
    let vote_signature: String;
    for (var i = 0; i < number_of_votes_expected; i++) {
      alternativeWallet = await createWallet(connection, 10);
      await initializeStudent(program, alternativeWallet, [subjectCode])
      vote_signature = await voteProposalByStudent(program, alternativeWallet, Number(proposalAccountBeforeVoting.id), Number(proposalAccountBeforeVoting.subjectId), Number(proposalAccountBeforeVoting.associatedProfessorProposalId), false, newSubjectAccount.code)
      await connection.confirmTransaction(vote_signature.toString())
    }

    // Fetching the proposal account after voting
    const proposalAccountAfterVoting = await fetchProposalAccount(program, idExpected, newSubjectAccount.code);
    expect(new anchor.BN(proposalAccountAfterVoting.againstVotes + proposalAccountAfterVoting.supportingVotes).eq(new anchor.BN(number_of_votes_expected))).to.be.true;

    // Getting the Program Return
    const lastVotingTransaction = await connection.getTransaction(vote_signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(lastVotingTransaction);
    const program_return = new Borsh.BinaryReader(buffer).readString();

    // After completing the voting process, the votation must continue being 'Rejecting' since all students voted 'false' (against the proposal)
    expect(program_return).to.deep.equal("Rejected")

    //Trying to delete the rejectedProposal by a HighRank
    await deleteRejectedProposalByHighRank(program, wallet1, proposalAccountAfterVoting.id, proposalAccountAfterVoting.subjectId, proposalAccountAfterVoting.associatedProfessorProposalId, newSubjectAccount.code);


    // Trying to fetch the proposal account and the professor proposal account --> they both must not exist 
    try {
      await fetchProposalAccount(program, proposalAccountAfterVoting.id, newSubjectAccount.code);
      assert.fail("Fetching the proposalAccount does not failed and the fail was expected")
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

    try {
      await fetchProfessorProposalAccount(program, proposalAccountAfterVoting.associatedProfessorProposalId, newSubjectAccount.code);
      assert.fail("Fetching the proposalAccount does not failed and the fail was expected")
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
    }

  });


});






