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
  
    const mint = await findPDAforMint(program.programId)
    const associatedTokenAccount = await getAssociatedTokenAddress(mint, authority.publicKey, false);
  
    const result = await program.methods.createStudent("3333", subjects)
      .accounts({
        authority: authority.publicKey,
        initializationSystemAccount: systemInitialization,
        studentIdHandler: id_generator_pda,
        highRankIdHandler: high_rank_id_handler,
        studentAccount: pda,
        codeIdSubjectRelation: codeIdRelation,
        mint: mint,
        tokenAccount: associatedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY
      })
      .signers([authority])
      .rpc();
  
    return result;
  }

// const initializeSystem = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair): Promise<String> => {

//     const initialization_system_account = await findPDAforSystemInitialization(program.programId)
//     const degree_id_generator_pda = await findPDAforIdGenerator(program.programId, "degree")
//     const faculty_id_generator_pda = await findPDAforIdGenerator(program.programId, "faculty")
//     const specialty_id_generator_pda = await findPDAforIdGenerator(program.programId, "specialty")
//     const subject_id_generator_pda = await findPDAforIdGenerator(program.programId, "subject")
//     const code_id_relation_account = await findPDAforCodeIdRelation(program.programId)
//     const high_rank_account = await findPDAforHighRank(program.programId, authority.publicKey)

//     const result = await program.methods.initializateNewSystem()
//         .accounts({
//             authority: authority.publicKey,
//             initializationSystemAccount: initialization_system_account,
//             highRankAccount: high_rank_account,
//             codeIdSubjectRelation: code_id_relation_account,
//             degreeIdHandler: degree_id_generator_pda,
//             facultyIdHandler: faculty_id_generator_pda,
//             specialtyIdHandler: specialty_id_generator_pda,
//             subjectIdHandler: subject_id_generator_pda,
//             systemProgram: anchor.web3.SystemProgram.programId,
//         })
//         .signers([authority])
//         .rpc();

//     return result;
// }

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

const initializeSubject = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string, degree_id: number, specialty_id: number, course: any, code: number, reference: string): Promise<String> => {

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





async function initDummyData() {

    // en la terminal: export ANCHOR_PROVIDER_URL=http://localhost:8899 && export ANCHOR_WALLET=../../../../canarionjl/.config/solana/id.json

    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());


    // shared objects
    const program = anchor.workspace.TeachingProjectHandler as Program<TeachingProjectHandler>;
    const connection = anchor.getProvider().connection;

    let alternativeWallet: anchor.web3.Keypair;

    console.log("Comenzando la ejecución...")
    
    const id = 1
    const vote = false
    const code = 43235
    
    const proposal = await fetchProposalAccount(program, id,code)


    for (var i: number = 1; i < proposal.expectedVotes; i++) {
        alternativeWallet = await createWallet(connection, 10);
        await initializeStudent(program, alternativeWallet, [code])
        let vote_signature = await voteProposalByStudent(program, alternativeWallet, proposal.id, proposal.subjectId, proposal.associatedProfessorProposalId, vote, code)
        await connection.confirmTransaction(vote_signature.toString())
        const proposal_inside = await fetchProposalAccount(program, id, code)
        console.log(proposal_inside)

    }

   

}

initDummyData()





