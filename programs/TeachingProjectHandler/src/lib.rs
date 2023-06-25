use anchor_lang::prelude::*;
use std::mem::size_of;
use std::fmt;
use std::usize::MAX;
use sha256::digest;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self,TokenAccount, Mint, Token, MintTo}
};


declare_id!("Hd3HLLMfbMJonaCvcQ8GugmTdKsGoHvce1JfAUU2gmiS");

const SOLANA_ACCOUNT_MAX_SIZE: usize = 1 * 10_usize.pow(4);  // 10 KB

const ENDING_TIMESTAMP_OFFSET: i64 = 2592000;
const EXTRA_VOTES_EXPECTED: u32 = 20;

/// CHECK: Modified to 20 to test the use cases --> real value = 2500;
const MAXIMUM_PARTICIPATION: u32 = 20;

const TOKENS_RECEIVED_AS_REWARD: u8 = 10;

#[program]
pub mod teaching_project_handler {

    use super::*;

    pub fn create_high_rank(ctx: Context<CreateHighRank>, user_type_code:String) -> Result<bool> {
        
        let high_rank_account = &mut *ctx.accounts.high_rank_account;

        let high_rank_id_handler = &mut *ctx.accounts.high_rank_id_handler;
        update_internally_initializated_id_generator(high_rank_id_handler);

        high_rank_account.id = general_id_generator(&mut ctx.accounts.high_rank_id_handler);
        high_rank_account.identifier_code_hash = digest(user_type_code);
        high_rank_account.authority = *ctx.accounts.authority.key;

        Ok(true)
    }

    pub fn create_professor(ctx: Context<CreateProfessor>, user_type_code:String, subjects_array: Vec<u32>) -> Result<bool> {

        let professor_account = &mut *ctx.accounts.professor_account;

        let professor_id_handler = &mut *ctx.accounts.professor_id_handler;
        update_internally_initializated_id_generator(professor_id_handler);

        professor_account.id = general_id_generator(&mut ctx.accounts.professor_id_handler);
        professor_account.identifier_code_hash = digest(user_type_code);
        professor_account.authority = *ctx.accounts.authority.key;

        let code_id_relation_account = &mut *ctx.accounts.code_id_subject_relation;

        professor_account.subjects = subjects_array;

        for subject_code in professor_account.subjects.clone() {
            match code_id_relation_account.get_id_key_from_code_value(subject_code as u32) {
                Some(_key_id) => code_id_relation_account.add_new_professor(subject_code),
                None => code_id_relation_account.add_new_code_value_without_corresponding_id (subject_code, false, true)
            }
        }  

        Ok(true)
    }

    pub fn create_student(ctx: Context<CreateStudent>, user_type_code:String, subjects_array: Vec<u32>) -> Result<bool> {

        let student_account = &mut *ctx.accounts.student_account;

        let student_id_handler = &mut *ctx.accounts.student_id_handler;
        update_internally_initializated_id_generator(student_id_handler);

        student_account.id = general_id_generator(&mut ctx.accounts.student_id_handler);
        student_account.identifier_code_hash = digest(user_type_code);
        student_account.authority = *ctx.accounts.authority.key;

        student_account.subjects = subjects_array;

        let code_id_relation_account = &mut *ctx.accounts.code_id_subject_relation;

        for subject_code in student_account.subjects.clone() {
            match code_id_relation_account.get_id_key_from_code_value(subject_code as u32) {
                Some(_key_id) => code_id_relation_account.add_new_student(subject_code),
                None => code_id_relation_account.add_new_code_value_without_corresponding_id (subject_code, true, false)
            }
        }   
        
        Ok(true)
    }

    pub fn create_faculty (ctx: Context<CreateFaculty>, name:String) -> Result<bool> {

        let faculty_account = &mut *ctx.accounts.faculty_account;
        faculty_account.id = general_id_generator(&mut ctx.accounts.faculty_id_handler);
        faculty_account.name = name;

        Ok(true)
    }

    pub fn create_degree (ctx: Context<CreateDegree>, name:String, faculty_id: i32) -> Result<bool> {

        let degree_account = &mut *ctx.accounts.degree_account;
        degree_account.id = general_id_generator(&mut ctx.accounts.degree_id_handler);
        degree_account.name = name;
        degree_account.faculty_id = faculty_id;

        Ok(true)

    }

    pub fn create_specialty (ctx: Context<CreateSpecialty>, name:String, degree_id: i32) -> Result<bool> {

        let specialty_account = &mut *ctx.accounts.specialty_account;
        specialty_account.id = general_id_generator(&mut ctx.accounts.specialty_id_handler);
        specialty_account.name = name;
        specialty_account.degree_id = degree_id;

        Ok(true)
    }

    pub fn create_subject(ctx: Context<CreateSubject>, name:String, degree_id: i32, specialty_id: i32, course: SubjectCourse, code: u32, teaching_project_reference: String) -> Result<bool> {

        let subject_account = &mut *ctx.accounts.subject_account;
        subject_account.id = general_id_generator(&mut ctx.accounts.subject_id_handler);
        subject_account.name = name;
        subject_account.degree_id = degree_id;
        subject_account.specialty_id = specialty_id;
        subject_account.course = course;
        subject_account.code = code;
        subject_account.teaching_project_reference = teaching_project_reference;

        let code_id_relation_account = &mut *ctx.accounts.code_id_subject_relation_account;
        code_id_relation_account.add_key_value_subject_pair(subject_account.id, code, false, false);

        //Creating the associated ProposalIdHandler and ProfessorProposalIdHandler
        update_internally_initializated_id_generator(&mut *ctx.accounts.proposal_id_handler);
        update_internally_initializated_id_generator(&mut *ctx.accounts.professor_proposal_id_handler);

        Ok(true)

    }

    pub fn create_proposal_by_student(ctx: Context<CreateProposalByStudent>, title:String, content:String) -> Result<bool> {

        let proposal_account = &mut *ctx.accounts.proposal_account;
        let subject_account = &mut *ctx.accounts.subject_account;
        let creator_account = &mut *ctx.accounts.student_creator;
        let associated_professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;

        let subject_professors = creator_account.subjects.clone();
        if !evaluate_if_user_belong_to_subject(subject_professors, subject_account.code) { return Err(error!(ErrorCode::UserDoesNotBelongToTheSubject)) }
        
        proposal_account.title = title;
        proposal_account.content = content;
        proposal_account.subject_id = subject_account.id;

        proposal_account.publishing_timestamp = Clock::get().unwrap().unix_timestamp;
        proposal_account.ending_timestamp = proposal_account.publishing_timestamp + ENDING_TIMESTAMP_OFFSET as i64;

        proposal_account.creator_id = creator_account.id;
        proposal_account.creator_public_key = creator_account.authority.key();

        let proposal_id = general_id_generator(&mut ctx.accounts.proposal_id_handler);
        proposal_account.id = proposal_id;
        subject_account.pending_proposals.push(proposal_id);

        proposal_account.user_type = ProposalUserType::Student;

        proposal_account.high_rank_validation = false;
        proposal_account.updated_by_teacher = false;

        let code_id_relation_account = &mut *ctx.accounts.code_id_subject_relation;
        let subject_info: AdditionalSubjectInfo;
        match code_id_relation_account.get_info_value_from_id_key(subject_account.id.clone()) {
            Some(info) => subject_info = info,
            None => return Err(error!(ErrorCode::AdditionalSubjectInfoNotFound))
        }

        proposal_account.expected_votes = (subject_info.number_of_students as u32 + subject_info.number_of_professors as u32) as u32 + EXTRA_VOTES_EXPECTED;

        //Initializating associated professor_proposal_account for possible future uses
        update_internally_initializated_id_generator(&mut *ctx.accounts.professor_proposal_id_handler);
        associated_professor_proposal_account.id = general_id_generator(&mut ctx.accounts.professor_proposal_id_handler);
        associated_professor_proposal_account.original_proposal_id = proposal_account.id;
        associated_professor_proposal_account.name = proposal_account.title.clone();

        proposal_account.associated_professor_proposal_id = associated_professor_proposal_account.id;

        emit! (NewProposalCreated {proposal_id: proposal_account.id , subject_id: proposal_account.subject_id});

        Ok(true)

    }

    pub fn create_proposal_by_professor(ctx: Context<CreateProposalByProfessor>, title:String, content:String) -> Result<bool> {

        let proposal_account = &mut *ctx.accounts.proposal_account;
        let subject_account = &mut *ctx.accounts.subject_account;
        let creator_account = &mut *ctx.accounts.professor_creator;
        let associated_professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;

        let subject_professors = creator_account.subjects.clone();
        if !evaluate_if_user_belong_to_subject(subject_professors, subject_account.code) { return Err(error!(ErrorCode::UserDoesNotBelongToTheSubject)) }

        proposal_account.title = title;
        proposal_account.content = content;
        proposal_account.subject_id = subject_account.id;

        subject_account.pending_proposals.push(proposal_account.id);

        proposal_account.publishing_timestamp = Clock::get().unwrap().unix_timestamp;
        proposal_account.ending_timestamp = proposal_account.publishing_timestamp + ENDING_TIMESTAMP_OFFSET;

        proposal_account.creator_id = creator_account.id;
        proposal_account.creator_public_key = creator_account.authority.key();

        proposal_account.id = general_id_generator(&mut ctx.accounts.proposal_id_handler);
        proposal_account.user_type = ProposalUserType::Professor;

        proposal_account.high_rank_validation = false;
        proposal_account.updated_by_teacher = false;

        let code_id_relation_account = &mut *ctx.accounts.code_id_subject_relation;
        let subject_info: AdditionalSubjectInfo;
        match code_id_relation_account.get_info_value_from_id_key(subject_account.id) {
            Some(info) => subject_info = info,
            None => return Err(error!(ErrorCode::AdditionalSubjectInfoNotFound))
        }

        proposal_account.expected_votes = (subject_info.number_of_students as u32 + subject_info.number_of_professors as u32) as u32 + EXTRA_VOTES_EXPECTED;

        //Initializating associated professor_proposal_account for possible future uses
        update_internally_initializated_id_generator(&mut *ctx.accounts.professor_proposal_id_handler);
        associated_professor_proposal_account.id = general_id_generator(&mut ctx.accounts.professor_proposal_id_handler);
        associated_professor_proposal_account.original_proposal_id = proposal_account.id;
        associated_professor_proposal_account.name = proposal_account.title.clone();

        proposal_account.associated_professor_proposal_id = associated_professor_proposal_account.id;

        emit! (NewProposalCreated {proposal_id: proposal_account.id , subject_id: proposal_account.subject_id});

        Ok(true)

    }

    pub fn vote_proposal_by_student(ctx: Context<VoteProposalByStudent>, vote: bool) -> Result<String> {
       
        let proposal_account = &mut *ctx.accounts.proposal_account;
        let student_account = &mut *ctx.accounts.voting_student;
        let subject_account = &mut *ctx.accounts.subject_account;
        let professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;

        let subject_professors = student_account.subjects.clone();
        if !evaluate_if_user_belong_to_subject(subject_professors, subject_account.code) { return Err(error!(ErrorCode::UserDoesNotBelongToTheSubject)) }

        // Evaluating if student has already voted
        for student_id in &(proposal_account.students_that_have_voted) {
            if student_id.clone() == student_account.id {
                return Err(error!(ErrorCode::UserHasAlreadyVoted));
            }
        }

        let votation_is_open = votation_is_open(proposal_account.ending_timestamp);

        // Evaluating if Votation is open --> if so, new vote is registered 
        if votation_is_open {
            if vote == true {
                proposal_account.supporting_votes = proposal_account.supporting_votes + 1;
            } else {
                proposal_account.against_votes = proposal_account.against_votes + 1;
            }
            proposal_account.students_that_have_voted.push(student_account.id)
       } 

       // Evaluating if the proposal has reached the minium participation (if so, if the proposal ended up in time or reached max. participation, it can be evaluated)
        let mut proposal_must_be_evaluated: bool = false;

        if votation_is_open {
            if proposal_has_reached_maximum_participation(proposal_account.supporting_votes, proposal_account.against_votes, MAXIMUM_PARTICIPATION) {
                proposal_must_be_evaluated = true
            } else {
                proposal_account.state = ProposalState::VotationInProgress
            }
        } else {
            if proposal_has_reached_minimum_partitipation(proposal_account.supporting_votes,proposal_account.against_votes, proposal_account.expected_votes) {
               proposal_must_be_evaluated = true;
            } else {
                proposal_account.state = ProposalState::Rejected
            }
        }

        if proposal_must_be_evaluated {

            if proposal_has_reached_agreement(proposal_account.supporting_votes, proposal_account.against_votes) {
                proposal_account.state = ProposalState::WaitingForTeacher;
                initialize_professor_proposal_account(professor_proposal_account, ENDING_TIMESTAMP_OFFSET);
                emit! (NewProfessorProposalCreated {proposal_id: proposal_account.id , professor_proposal_id: professor_proposal_account.id});
            } else {
                proposal_account.state = ProposalState::Rejected;
            }
        }

       // If votation is not open, error is returned due to the student could not make his/her vote  
       if !votation_is_open {return  Err(error!(ErrorCode::VotationIsNotOpen)) }; 

       Ok(proposal_account.state.to_string()) 

    }

    pub fn vote_proposal_by_professor(ctx: Context<VoteProposalByProfessor>, vote: bool) -> Result<String> {

        let proposal_account = &mut *ctx.accounts.proposal_account;
        let subject_account = &mut *ctx.accounts.subject_account;
        let professor_account = &mut *ctx.accounts.voting_professor;
        let professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;

        let subject_professors = professor_account.subjects.clone();
        if !evaluate_if_user_belong_to_subject(subject_professors, subject_account.code) { return Err(error!(ErrorCode::UserDoesNotBelongToTheSubject)) }

        // Evaluating if student has already voted
        for professor_id in &(proposal_account.professors_that_have_voted) {
            if professor_id.clone() == professor_account.id {
                return Err(error!(ErrorCode::UserHasAlreadyVoted));
            }
        }

        let votation_is_open = votation_is_open(proposal_account.ending_timestamp);

        // Evaluating if Votation is open --> if so, new vote is registered 
        if votation_is_open {
            if vote == true {
                proposal_account.supporting_votes = proposal_account.supporting_votes + 1;
            } else {
                proposal_account.against_votes = proposal_account.against_votes + 1;
            }
            proposal_account.professors_that_have_voted.push(professor_account.id)
       } 

      // Evaluating if the proposal has reached the minium participation (if so, if the proposal ended up in time or reached max. participation, it can be evaluated)
      let mut proposal_must_be_evaluated: bool = false;

      if votation_is_open {
          if proposal_has_reached_maximum_participation(proposal_account.supporting_votes, proposal_account.against_votes, MAXIMUM_PARTICIPATION) {
              proposal_must_be_evaluated = true
          } else {
              proposal_account.state = ProposalState::VotationInProgress
          }
      } else {
          if proposal_has_reached_minimum_partitipation(proposal_account.supporting_votes,proposal_account.against_votes, proposal_account.expected_votes) {
             proposal_must_be_evaluated = true;
          } else {
              proposal_account.state = ProposalState::Rejected
          }
      }

      if proposal_must_be_evaluated {
          if proposal_has_reached_agreement(proposal_account.supporting_votes, proposal_account.against_votes) {
              proposal_account.state = ProposalState::WaitingForTeacher;
              initialize_professor_proposal_account(professor_proposal_account, ENDING_TIMESTAMP_OFFSET);
              emit! (NewProfessorProposalCreated {proposal_id: proposal_account.id , professor_proposal_id: professor_proposal_account.id});
          } else {
              proposal_account.state = ProposalState::Rejected;
          }
      }

       // If votation is not open, error is returned due to the student could not make his/her vote  
       if !votation_is_open {return  Err(error!(ErrorCode::VotationIsNotOpen)) }; 

       Ok(proposal_account.state.to_string()) 

    }

    pub fn update_proposal_by_professor (ctx: Context<UpdateProposalByProfessor>, teaching_project_reference: String) -> Result <bool> {

        let proposal_account = &mut *ctx.accounts.proposal_account;
        let associated_professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;
        let professor_account = &mut *ctx.accounts.professor_account;

        associated_professor_proposal_account.teaching_project_reference = teaching_project_reference;

        associated_professor_proposal_account.state = ProfessorProposalState::Complete;
        proposal_account.state = ProposalState::WaitingForHighRank;


        // Evaluating if professor has delayed more than permitted --> if so, applying the appropiate penalty

        let penalty = evaluating_professor_penalty(associated_professor_proposal_account, ENDING_TIMESTAMP_OFFSET);

        if penalty > 0 {
            professor_account.punishments = professor_account.punishments + penalty;
        }

        Ok(true)
    }
   
    pub fn update_proposal_by_high_rank (ctx: Context<UpdateProposalByHighRank>, accepted:bool) -> Result <bool> {

        let proposal_account = &mut *ctx.accounts.proposal_account;
        let associated_professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;
        let subject_account = &mut *ctx.accounts.subject_account;

        let proposal_state: ProposalState;
        let professor_proposal_state: ProfessorProposalState;

        if accepted {
            proposal_state = ProposalState:: Accepted;
            professor_proposal_state = ProfessorProposalState::Complete;
            subject_account.teaching_project_reference = associated_professor_proposal_account.teaching_project_reference.clone();
        } else {
            proposal_state = ProposalState:: WaitingForTeacher;
            professor_proposal_state = ProfessorProposalState::Pending;
        }

        proposal_account.state = proposal_state;
        associated_professor_proposal_account.state = professor_proposal_state;

        Ok (true)
    }

    pub fn give_credits_to_winning_student(ctx: Context<GiveCreditToWinningStudent>, user_type_code:String, _subject_code: u32, mint_authority_bump: u8) -> Result <bool> {

        //Checking if the publicKey of the creator account passed matches the proposal's creator public key field
        let proposal_account_creator_public_key = ctx.accounts.proposal_account.creator_public_key;
        let creator_account_public_key = ctx.accounts.creator_account.authority.key();
         require_keys_eq!(proposal_account_creator_public_key, creator_account_public_key);

        // // Minting new token to the creator account as a reward for his/her proposal having been accepted
        let bump = &[mint_authority_bump];
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[&[b"mint_authority", mint_key.as_ref(), user_type_code.as_bytes().as_ref(), bump][..]];
        token::mint_to(ctx.accounts.get_mint_ctx().with_signer(seeds), TOKENS_RECEIVED_AS_REWARD as u64)?;

        // Updating the proposal state to avoid the credits being payed more than once
        let proposal_account = &mut *ctx.accounts.proposal_account;
        proposal_account.state = ProposalState::AcceptedAndTokensGranted;

        Ok(true)

    }

    pub fn give_credits_to_winning_professor(ctx: Context<GiveCreditToWinningProfessor>, user_type_code:String, _subject_code: u32, mint_authority_bump: u8) -> Result <bool> {

        //Checking if the publicKey of the creator account passed matches the proposal's creator public key field
        let proposal_account_creator_public_key = ctx.accounts.proposal_account.creator_public_key;
        let creator_account_public_key = ctx.accounts.creator_account.authority.key();
        require_keys_eq!(proposal_account_creator_public_key, creator_account_public_key);

        // Minting new token to the creator account as a reward for his/her proposal having been accepted
        let bump = &[mint_authority_bump];
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[&[b"mint_authority", mint_key.as_ref(), user_type_code.as_bytes().as_ref(), bump][..]];
        token::mint_to(ctx.accounts.get_mint_ctx().with_signer(seeds), TOKENS_RECEIVED_AS_REWARD as u64)?;

        // Updating the proposal state to avoid the credits being payed more than once
        let proposal_account = &mut *ctx.accounts.proposal_account;
        proposal_account.state = ProposalState::AcceptedAndTokensGranted;

        Ok(true)

    }

    pub fn delete_rejected_proposal_account (ctx: Context<DeleteRejectedProposal>) -> Result<bool> {

        let subject_account = &mut *ctx.accounts.subject_account;
        let proposal_account = &mut *ctx.accounts.proposal_account;

        let proposal_id = proposal_account.id;
        let mut array_of_proposals = subject_account.pending_proposals.clone();

        let position = array_of_proposals.iter().position(|x| *x == proposal_id).unwrap();
        array_of_proposals.remove(position);
        subject_account.pending_proposals = array_of_proposals;

        Ok (true)
    }
   
    pub fn initializate_new_system (ctx: Context <InitializeSystem>, _user_type_code:String) -> Result<bool> {

        //Initializating the Subjects' Code-Id Relation
        let code_id_subject_relation_account = &mut *ctx.accounts.code_id_subject_relation;
        code_id_subject_relation_account.code_value = vec![];
        code_id_subject_relation_account.key_id = vec![];

        //Marking the system as initialized
        let system_account = &mut *ctx.accounts.initialization_system_account;
        system_account.system_is_initialized = true;

        //Initializing Id's Generator for Academic Data 
        let degree_id_generator_account = &mut *ctx.accounts.degree_id_handler;
        degree_id_generator_account.smaller_id_available = 1;

        let faculty_id_generator_account = &mut *ctx.accounts.faculty_id_handler;
        faculty_id_generator_account.smaller_id_available = 1;

        let specialty_id_generator_account = &mut *ctx.accounts.specialty_id_handler;
        specialty_id_generator_account.smaller_id_available = 1;

        let subject_id_generator_account = &mut *ctx.accounts.subject_id_handler;
        subject_id_generator_account.smaller_id_available = 1;

        Ok(true)

    }


    
}

                                                       // ------- AUX FUNCTIONS ------------- //

fn general_id_generator (id_handler_account: &mut Account<IdHandler>) ->  i32 {
    let id: i32 = id_handler_account.smaller_id_available;
    id_handler_account.smaller_id_available = id_handler_account.smaller_id_available + 1;
    return id;
}

pub fn update_internally_initializated_id_generator(id_handler_account: &mut IdHandler) {

    if id_handler_account.smaller_id_available == 0 { id_handler_account.smaller_id_available += 1; }
}


fn initialize_professor_proposal_account(professor_proposal_account: &mut ProfessorProposal, timestamp_offset: i64) {

    let publishing_timestamp = Clock::get().unwrap().unix_timestamp;
    let ending_timestamp = publishing_timestamp + (timestamp_offset/2);
 
    professor_proposal_account.publishing_timestamp = publishing_timestamp;
    professor_proposal_account.ending_timestamp = ending_timestamp;
    professor_proposal_account.state = ProfessorProposalState::Pending;
 
 }
 

fn votation_is_open (ending_timestamp_of_votation: i64) -> bool {
    if Clock::get().unwrap().unix_timestamp < ending_timestamp_of_votation {true} else {false}
}


fn proposal_has_reached_minimum_partitipation(supporting_votes: u32, against_votes: u32, expected_votes: u32) -> bool {
    return (supporting_votes + against_votes) >= expected_votes
}

fn proposal_has_reached_maximum_participation (supporting_votes: u32, against_votes: u32, max_participation: u32) -> bool {
   return (supporting_votes + against_votes) >= max_participation as u32
}

fn proposal_has_reached_agreement(supporting_votes: u32, against_votes: u32) -> bool {
    let total_votes: f32 = supporting_votes as f32 + against_votes as f32;
    return (supporting_votes as f32) / (total_votes) as f32 >= (2_f32/3_f32 as f32) 
}


fn evaluating_professor_penalty (professor_proposal_account: &mut ProfessorProposal, timestamp_offset: i64) -> u8 {
    let current_timestamp = Clock::get().unwrap().unix_timestamp;
    let mut penalty_counter: u8 = 0;
    while penalty_counter as i64 * (timestamp_offset/2) + current_timestamp > professor_proposal_account.ending_timestamp {
        penalty_counter = penalty_counter + 1;
    }

    return penalty_counter;
        
}


fn evaluate_if_user_belong_to_subject(subjects: Vec<u32>, subject_code:u32) -> bool {

    let mut user_belong: bool = false;
 
    for subject in subjects {
         if subject_code == subject {
             user_belong = true;
         }
     }
 
    return user_belong;
 }
 

                          // --------- ACCOUNTS DATA STRUCTURES ('CTX' PARAM IN 'teaching_project_handler' MOD FUNCTIONS) ----- 

#[derive(Accounts)]
#[instruction(_user_type_code: String)]
pub struct InitializeSystem <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = size_of::<SystemInitialization>() + (8 as usize),
        seeds = [b"systemInitialization"],
        bump,
    )]
    pub initialization_system_account: Account<'info, SystemInitialization>,

    #[account(
        has_one = authority,
        seeds=[b"highRank", authority.key().as_ref()],
        bump,
        constraint = high_rank_account.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c"
    )]
    pub high_rank_account: Account<'info, HighRank>,

    #[account(
        init,
        payer = authority,
        space = SOLANA_ACCOUNT_MAX_SIZE,
        seeds = [b"codeIdSubjectRelation"],
        bump
    )]
    pub code_id_subject_relation: Account<'info, CodeIdSubjectRelation>,

    #[account(
        init,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"degreeIdHandler"],
        bump
    )]
    pub degree_id_handler: Account<'info,IdHandler>,

    #[account(
        init,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"facultyIdHandler"],
        bump
    )]
    pub faculty_id_handler: Account<'info,IdHandler>,

    #[account(
        init,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"specialtyIdHandler"],
        bump
    )]
    pub specialty_id_handler: Account<'info,IdHandler>,

    #[account(
        init,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"subjectIdHandler"],
        bump
    )]
    pub subject_id_handler: Account<'info,IdHandler>,

    /// CHECK: 'mint_authority' is an UncheckedAccount since it's just a PDA that references the authority of any HighRank over the tokens
    #[account(
        mut, 
        seeds = [b"mint_authority",  mint.key().as_ref(), _user_type_code.as_bytes().as_ref() ],
        bump,
        constraint = digest(_user_type_code) == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c"
    )]
    pub mint_authority_account: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        mint::decimals = 1,
        mint::authority = mint_authority_account,
        seeds = [b"creditToken"],
        bump
    )]
    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    // pub associated_token_program: Program<'info, AssociatedToken>,
    // pub rent: Sysvar<'info, Rent>, 
}


#[derive(Accounts)]
#[instruction (user_type_code: String)]
pub struct CreateHighRank<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"highRankIdHandler"],
        bump
    )]
    pub high_rank_id_handler: Account<'info,IdHandler>,

    #[account(init, 
        payer=authority, 
        space = size_of::<HighRank>() + 12 + 100, 
        seeds=[b"highRank", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code.clone()) == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c")
    ]
    pub high_rank_account: Account<'info, HighRank>,

    pub system_program: Program<'info,System>,

}

#[derive(Accounts)]
#[instruction (user_type_code: String)]
pub struct CreateProfessor<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"systemInitialization"],
        bump,
        constraint = initialization_system_account.system_is_initialized == true @ ErrorCode::SystemIsNotInitializated
    )]
    pub initialization_system_account: Account<'info, SystemInitialization>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"professorIdHandler"],
        bump
    )]
    pub professor_id_handler: Account<'info,IdHandler>,

    #[account(
        constraint = high_rank_id_handler.smaller_id_available > 1  @ ErrorCode::NotAnyHighRankInitializated
    )]
    pub high_rank_id_handler: Account<'info,IdHandler>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Professor>() + 12 + 60 + 100 + 100, 
        seeds=[b"professor", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code) == "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9")
    ]
    pub professor_account: Account<'info, Professor>,

    #[account(
        mut,
        seeds = [b"codeIdSubjectRelation"],
        bump
    )]
    pub code_id_subject_relation: Account<'info, CodeIdSubjectRelation>,

    #[account()]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed, 
        payer = authority, 
        associated_token::mint = mint,
        associated_token::authority = authority)]
    pub token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>, 
}

#[derive(Accounts)]
#[instruction (user_type_code: String)]
pub struct CreateStudent<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"systemInitialization"],
        bump,
        constraint = initialization_system_account.system_is_initialized == true @ ErrorCode::SystemIsNotInitializated
    )]
    pub initialization_system_account: Account<'info, SystemInitialization>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"studentIdHandler"],
        bump
    )]
    pub student_id_handler: Account<'info,IdHandler>,

    #[account(
        constraint = high_rank_id_handler.smaller_id_available > 1  @ ErrorCode::NotAnyHighRankInitializated
    )]
    pub high_rank_id_handler: Account<'info,IdHandler>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Student>() + 12 + 100 + 100, 
        seeds=[b"student", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code) == "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69")
    ]
    pub student_account: Account<'info, Student>,

    #[account(
        mut,
        seeds = [b"codeIdSubjectRelation"],
        bump
    )]
    pub code_id_subject_relation: Account<'info, CodeIdSubjectRelation>,

    #[account()]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed, 
        payer = authority, 
        associated_token::mint = mint,
        associated_token::authority = authority)]
    pub token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
#[instruction (name: String)]
pub struct CreateFaculty<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"systemInitialization"],
        bump,
        constraint = initialization_system_account.system_is_initialized == true @ ErrorCode::SystemIsNotInitializated
    )]
    pub initialization_system_account: Account<'info, SystemInitialization>,

    #[account(mut)]
    pub faculty_id_handler: Account<'info,IdHandler>,

    #[account(has_one = authority)] 
    pub high_rank: Account<'info, HighRank>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Faculty>() + name.as_bytes().len() + 4, 
        seeds=[b"faculty", faculty_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = name.len() <= 50
    )]
    pub faculty_account: Account<'info, Faculty>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (name: String, faculty_id:i32)]
pub struct CreateDegree<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"systemInitialization"],
        bump,
        constraint = initialization_system_account.system_is_initialized == true @ ErrorCode::SystemIsNotInitializated
    )]
    pub initialization_system_account: Account<'info, SystemInitialization>,

    #[account(mut)]
    pub degree_id_handler: Account<'info,IdHandler>,

    #[account(mut)]
    pub faculty_id_handler: Account<'info, IdHandler>,

    #[account(has_one = authority)] 
    pub high_rank: Account<'info, HighRank>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Degree>() + name.as_bytes().len() + 4, 
        seeds=[b"degree", degree_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = name.len() <= 500,
        constraint = (faculty_id >= 1 && faculty_id < faculty_id_handler.smaller_id_available)
    )]
    pub degree_account: Account<'info, Degree>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (name: String, degree_id:i32)]
pub struct CreateSpecialty <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"systemInitialization"],
        bump,
        constraint = initialization_system_account.system_is_initialized == true @ ErrorCode::SystemIsNotInitializated
    )]
    pub initialization_system_account: Account<'info, SystemInitialization>,

    #[account(mut)]
    pub specialty_id_handler: Account<'info, IdHandler>,

    #[account(mut)]
    pub degree_id_handler: Account<'info, IdHandler>,

    #[account(has_one = authority)] 
    pub high_rank: Account<'info, HighRank>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Specialty>() + name.as_bytes().len() + 4, 
        seeds=[b"specialty", specialty_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = name.len() <= 500,
        constraint = (degree_id >= 1 && degree_id < degree_id_handler.smaller_id_available)
    )]
    pub specialty_account: Account<'info, Specialty>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (name: String, degree_id: i32, specialty_id: i32, course: SubjectCourse, code: u32, teaching_project_reference: String)]
pub struct CreateSubject<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"systemInitialization"],
        bump,
        constraint = initialization_system_account.system_is_initialized == true @ ErrorCode::SystemIsNotInitializated
    )]
    pub initialization_system_account: Account<'info, SystemInitialization>,
    
    #[account(mut, has_one = authority)]      // Se comprueba que la cuenta de "Alto cargo" pasada pertenece a quien firma la transacción (autenticación)
    pub high_rank: Account<'info, HighRank>,

    #[account(mut)]
    pub subject_id_handler: Account<'info,IdHandler>,

    #[account()]
    pub degree_id_handler: Account<'info,IdHandler>,

    #[account()]
    pub specialty_id_handler: Account<'info,IdHandler>,


    #[account(init, 
        payer=authority, 
        space = size_of::<Subject>() + name.as_bytes().len() + teaching_project_reference.as_bytes().len(), 
        seeds=[b"subject", subject_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = (degree_id >= 1) && (degree_id < degree_id_handler.smaller_id_available),
        constraint = (specialty_id == -1) || (specialty_id >= 1 && specialty_id < specialty_id_handler.smaller_id_available),
        constraint = teaching_project_reference.len() == 46 @ ErrorCode::IncorrectTeachingProjectReference
    )]
    pub subject_account: Account<'info, Subject>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"proposalIdHandler", code.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal_id_handler: Account<'info,IdHandler>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"professorProposalIdHandler", code.to_le_bytes().as_ref()],
        bump
    )]
    pub professor_proposal_id_handler: Account<'info, IdHandler>,

    #[account(
        mut,
        seeds = [b"codeIdSubjectRelation"],
        bump
    )]
    pub code_id_subject_relation_account: Account<'info, CodeIdSubjectRelation>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction (title: String, content: String)]
pub struct CreateProposalByStudent <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"systemInitialization"],
        bump,
        constraint = initialization_system_account.system_is_initialized == true @ ErrorCode::SystemIsNotInitializated
    )]
    pub initialization_system_account: Account<'info, SystemInitialization>,
    
    #[account(mut, has_one = authority)]      
    pub student_creator: Account<'info, Student>,

    #[account(
        mut,
        seeds = [b"proposalIdHandler", subject_account.code.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal_id_handler: Account<'info,IdHandler>,

    #[account(
        mut,
        seeds = [b"professorProposalIdHandler", subject_account.code.to_le_bytes().as_ref()],
        bump
    )]
    pub professor_proposal_id_handler: Account<'info, IdHandler>,
    
    #[account()]
    pub subject_id_handler: Account<'info,IdHandler>,

    #[account(
        init, 
        payer=authority, 
        space = size_of::<Proposal>() + title.as_bytes().len() + content.as_bytes().len() + 40, 
        seeds=[b"proposal", proposal_id_handler.smaller_id_available.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()], 
        bump,
        constraint = student_creator.identifier_code_hash == "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69",
        constraint = title.len() <= 100 && content.len() <= 2500       
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(init,
        payer = authority,
        space = size_of::<ProfessorProposal>() + title.len() + 20 + 60,
        seeds = [b"professorProposal", professor_proposal_id_handler.smaller_id_available.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()],
        bump,
    )]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,

    #[account(
        mut,
        seeds = [b"subject", subject_account.id.to_le_bytes().as_ref()],
        bump,
        realloc = 
            size_of::<Subject>() + 
            (subject_account.name.as_bytes().len() as usize) - (20 as usize) + 
            (subject_account.teaching_project_reference.as_bytes().len() as usize) - (20 as usize) +
            (subject_account.pending_proposals.len() as u16 * 4_u16 + 8_u16) as usize - (20 as usize),
        realloc::payer = authority,
        realloc::zero = false
        
    )]
    pub subject_account: Account<'info, Subject>,

    #[account(
        mut,
        seeds = [b"codeIdSubjectRelation"],
        bump
    )]
    pub code_id_subject_relation: Account<'info, CodeIdSubjectRelation>,

    pub system_program: Program<'info, System>

}

#[derive(Accounts)]
#[instruction (title: String, content: String)]
pub struct CreateProposalByProfessor <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"systemInitialization"],
        bump,
        constraint = initialization_system_account.system_is_initialized == true @ ErrorCode::SystemIsNotInitializated
    )]
    pub initialization_system_account: Account<'info, SystemInitialization>,
    
    #[account(mut, has_one = authority)]      
    pub professor_creator: Account<'info, Professor>,

     #[account(
        mut,
        seeds = [b"proposalIdHandler", subject_account.code.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal_id_handler: Account<'info,IdHandler>,

    #[account(
        mut,
        seeds = [b"professorProposalIdHandler", subject_account.code.to_le_bytes().as_ref()],
        bump
    )]
    pub professor_proposal_id_handler: Account<'info, IdHandler>,
    
    #[account()]
    pub subject_id_handler: Account<'info,IdHandler>,

    #[account(
        init, 
        payer=authority, 
        space = size_of::<Proposal>() + title.as_bytes().len() + content.as_bytes().len() + 40, 
        seeds=[b"proposal", proposal_id_handler.smaller_id_available.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()], 
        bump,
        constraint = professor_creator.identifier_code_hash == "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9",
        constraint = title.len() <= 100 && content.len() <= 2500       
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(init,
        payer = authority,
        space = size_of::<ProfessorProposal>() + title.len() + 20,
        seeds = [b"professorProposal", professor_proposal_id_handler.smaller_id_available.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()],
        bump,
    )]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,


    #[account(
        mut,
        seeds = [b"subject", subject_account.id.to_le_bytes().as_ref()],
        bump,
        realloc = 
            size_of::<Subject>() + 
            (subject_account.name.as_bytes().len() as usize) - (20 as usize) + 
            (subject_account.teaching_project_reference.as_bytes().len() as usize) - (20 as usize) +
            (subject_account.pending_proposals.len() as u16 * 4_16 + 8_u16) as usize - (20 as usize),
        realloc::payer = authority,
        realloc::zero = false
    )]
    pub subject_account: Account<'info, Subject>,

    #[account(
        seeds = [b"codeIdSubjectRelation"],
        bump
    )]
    pub code_id_subject_relation: Account<'info, CodeIdSubjectRelation>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct VoteProposalByStudent <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, has_one = authority)]      
    pub voting_student: Account<'info, Student>,
    
    #[account()]
    pub subject_id_handler: Account<'info, IdHandler>,

    #[account(
        mut,
        seeds=[b"proposal", proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()], 
        bump,
        constraint = voting_student.identifier_code_hash == "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69",
        constraint = ProposalState::VotationInProgress == proposal_account.state @ErrorCode::VotationIsNotOpen,                                     
        realloc = size_of::<Proposal>() + 
                proposal_account.title.as_bytes().len() - (20 as usize) +
                proposal_account.content.as_bytes().len() - (20 as usize) +
                proposal_account.students_that_have_voted.len() * 4 + 4 - (20 as usize),
        realloc::payer = authority,
        realloc::zero = false
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(
        seeds = [b"subject", proposal_account.subject_id.to_le_bytes().as_ref()],
        bump,
        constraint =  proposal_account.subject_id < subject_id_handler.smaller_id_available
    )]
    pub subject_account: Account<'info, Subject>,

    #[account(mut)]
    pub professor_proposal_id_handler: Account<'info, IdHandler>,

    #[account(
        mut,
        seeds = [b"professorProposal", professor_proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()],
        bump,
        constraint = professor_proposal_account.original_proposal_id == proposal_account.id,
        constraint = professor_proposal_account.id < professor_proposal_id_handler.smaller_id_available
    )]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct VoteProposalByProfessor <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, has_one = authority)]      
    pub voting_professor: Account<'info, Professor>,
    
    #[account()]
    pub subject_id_handler: Account<'info, IdHandler>,

    #[account(
        mut,
        seeds=[b"proposal", proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()], 
        bump,
        constraint = voting_professor.identifier_code_hash == "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9",
        constraint = ProposalState::VotationInProgress == proposal_account.state @ ErrorCode::VotationIsNotOpen,
        realloc = size_of::<Proposal>() + 
                proposal_account.title.as_bytes().len() - (20 as usize) +
                proposal_account.content.as_bytes().len() - (20 as usize) +
                proposal_account.students_that_have_voted.len() * 4 + 4 - (20 as usize),
        realloc::payer = authority,
        realloc::zero = false                                           
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(
        seeds = [b"subject", proposal_account.subject_id.to_le_bytes().as_ref()],
        bump,
        constraint = proposal_account.subject_id < subject_id_handler.smaller_id_available
    )]
    pub subject_account: Account<'info, Subject>,

    #[account(mut)]
    pub professor_proposal_id_handler: Account<'info, IdHandler>,

    #[account(
        mut,
        seeds = [b"professorProposal", professor_proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()],
        bump,
        constraint = professor_proposal_account.original_proposal_id == proposal_account.id,
        constraint = professor_proposal_account.id < professor_proposal_id_handler.smaller_id_available
    )]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction (teaching_project_reference: String)]
pub struct UpdateProposalByProfessor <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, has_one = authority)]      
    pub professor_account: Account<'info, Professor>,
    
    #[account(
        mut,
        seeds=[b"proposal", proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()], 
        bump,
        constraint = professor_account.identifier_code_hash == "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9",
        constraint = ProposalState::WaitingForTeacher == proposal_account.state  @  ErrorCode::VotationIsNotWaitingForTeacher                                           
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(
        mut,
        seeds = [b"professorProposal", professor_proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()],
        bump,
        constraint = professor_proposal_account.original_proposal_id == proposal_account.id,
        constraint = proposal_account.associated_professor_proposal_id == professor_proposal_account.id,
        constraint = teaching_project_reference.len() == 46 @ ErrorCode::IncorrectTeachingProjectReference
    )]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,

    #[account(
        seeds = [b"subject", proposal_account.subject_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub subject_account: Account<'info, Subject>,

}

#[derive(Accounts)]
pub struct UpdateProposalByHighRank <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, has_one = authority)]      
    pub high_rank_account: Account<'info, HighRank>,

    #[account(
        mut,
        seeds=[b"proposal", proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref() ], 
        bump,
        constraint = high_rank_account.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = ProposalState::WaitingForHighRank == proposal_account.state  @  ErrorCode::VotationIsNotWaitingForHighRank,                                       
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(
        mut,
        seeds = [b"professorProposal", professor_proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()],
        bump,
        constraint = professor_proposal_account.original_proposal_id == proposal_account.id,
        constraint = proposal_account.associated_professor_proposal_id == professor_proposal_account.id,
    )]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,

    #[account(
        mut,
        seeds = [b"subject", proposal_account.subject_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub subject_account: Account<'info, Subject>,

}

#[derive(Accounts)]
#[instruction (user_type_code: String, _subject_code: u32)]
pub struct GiveCreditToWinningStudent <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        has_one = authority
    )]      
    pub high_rank_account: Account<'info, HighRank>,

    #[account(
        mut,
        seeds=[b"proposal", proposal_account.id.to_le_bytes().as_ref(), _subject_code.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank_account.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = ProposalState::Accepted == proposal_account.state  @  ErrorCode::VotationIsNotAccepted,                                       
    )]
    pub proposal_account: Account<'info, Proposal>,


    #[account(
        mut,
        seeds=[b"student", proposal_account.creator_public_key.as_ref()], 
        bump,
        constraint = creator_account.identifier_code_hash == "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69",
        constraint = creator_account.id == proposal_account.creator_id                             
    )]
    pub creator_account: Account<'info, Student>,

    /// CHECK: 'mint_authority' is an UncheckedAccount since it's just a PDA that references the authority of any HighRank over the tokens
    #[account(
        mut, 
        seeds = [b"mint_authority", mint.key().as_ref(), user_type_code.as_bytes().as_ref()],
        bump,
        constraint = digest(user_type_code) == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c"
    )]
    pub mint_authority_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>, 
}

impl<'info> GiveCreditToWinningStudent <'info> {

    pub fn get_mint_ctx(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {

        let cpi_program =  self.token_program.to_account_info();
        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.token_account.to_account_info(),
            authority: self.mint_authority_account.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

#[derive(Accounts)]
#[instruction (user_type_code: String, _subject_code: u32)]
pub struct GiveCreditToWinningProfessor <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        has_one = authority
    )]      
    pub high_rank_account: Account<'info, HighRank>,

    #[account(
        mut,
        seeds=[b"proposal", proposal_account.id.to_le_bytes().as_ref(), _subject_code.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank_account.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = ProposalState::Accepted == proposal_account.state  @  ErrorCode::VotationIsNotAccepted,                                       
    )]
    pub proposal_account: Account<'info, Proposal>,


    #[account(
        mut,
        seeds=[b"professor", proposal_account.creator_public_key.to_bytes().as_ref()], 
        bump,
        constraint = creator_account.identifier_code_hash == "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9",
        constraint = creator_account.id == proposal_account.creator_id                             
    )]
    pub creator_account: Account<'info, Professor>,


   /// CHECK: 'mint_authority' is an UncheckedAccount since it's just a PDA that references the authority of any HighRank over the tokens
   #[account(
    mut, 
    seeds = [b"mint_authority", mint.key().as_ref(), user_type_code.as_bytes().as_ref()],
    bump,
    constraint = digest(user_type_code) == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c"
    )]
    pub mint_authority_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>, 
}

impl<'info> GiveCreditToWinningProfessor <'info> {

    pub fn get_mint_ctx(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {

        let cpi_program =  self.token_program.to_account_info();
        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.token_account.to_account_info(),
            authority: self.mint_authority_account.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

#[derive(Accounts)]
pub struct DeleteRejectedProposal <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, has_one = authority)]      
    pub high_rank_account: Account<'info, HighRank>,

    #[account(
        mut,
        seeds=[b"proposal", proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()],
        bump,
        constraint = high_rank_account.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = ProposalState::Rejected == proposal_account.state  @  ErrorCode::VotationIsNotRejected,
        close = authority                                            
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(
        mut,
        seeds = [b"professorProposal", professor_proposal_account.id.to_le_bytes().as_ref(), subject_account.code.to_le_bytes().as_ref()],
        bump,
        constraint = professor_proposal_account.original_proposal_id == proposal_account.id,
        constraint = proposal_account.associated_professor_proposal_id == professor_proposal_account.id,
        close = authority
    )]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,

    #[account(
        mut,
        seeds = [b"subject", proposal_account.subject_id.to_le_bytes().as_ref()],
        bump,
        constraint = proposal_account.subject_id == subject_account.id
    )]
    pub subject_account: Account<'info, Subject>,
}


                                                // -------------- ACCOUNTS (DATA STRUCTS) --------------------- //


//  ----Users ----  // 

#[account]
#[derive(Default)]
pub struct HighRank {
    id: i32,                                // 8 bytes
    identifier_code_hash: String,           // Tamaño real: 32 bytes + 4 (alineación) = 36 bytes || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 12 bytes
    authority: Pubkey,                      // 32 bytes
    pendent_professor_proposals: Vec<i64>   // Suponiendo 15 propuestas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
}

#[account]
#[derive(Default)]
pub struct IdHandler {
    smaller_id_available: i32,
    reused_id: Vec<i64>                     // Suponiendo 20 id's: 20*8 bytes (160 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 140 bytes
}

#[account]
#[derive(Default)]
pub struct Professor {
    id: i32,                                      // 8 bytes
    identifier_code_hash: String,                 // Tamaño real: 32 bytes + 4 (alineación) = 36 bytes || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 12 bytes
    authority: Pubkey,                            // 32 bytes
    subjects: Vec<u32>,                           // Suponiendo 10 asignaturas: 10*8 bytes (80 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 60 bytes
    pendent_learning_project_proposal: Vec<i64>,  // Suponiendo 15 propuestas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
    pendent_votation_proposals: Vec<i64>,         // Suponiendo 15 propuestas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
    punishments: u8,                              // 1 byte
    rewards: u32,                                 // 4 bytes
}
    
#[account]
#[derive(Default)]
pub struct Student {
    id: i32,                               // 8 bytes
    identifier_code_hash: String,          // Tamaño real: 32 bytes + 4 (alineación) = 36 bytes || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 12 bytes
    authority: Pubkey,                     // 32 bytes
    subjects: Vec<u32>,                    // Suponiendo 15 asignaturas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
    pendent_votation_proposals: Vec<i64>,  // Suponiendo 15 propuestas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
    punishments: u8,                       // 1 byte
    rewards: u32,                          // 4 bytes
} 


// ------ Academic Data ------ //

#[account]
#[derive(Default)]
pub struct Faculty {
id: i32,      // 8 bytes
name: String  // Longitud variable (máx establecido en 200 caracteres)
}

#[account]
#[derive(Default)]
pub struct Degree {
id: i32,
name: String,
faculty_id: i32
}

#[account]
#[derive(Default)]
pub struct Specialty {
id: i32,
name: String,
degree_id: i32
}

#[account]
#[derive(Default)]
pub struct Subject {
    name: String,
    id: i32,
    code: u32,
    degree_id: i32,
    specialty_id: i32,
    teaching_project_reference: String,
    course: SubjectCourse,
    pending_proposals: Vec<i32>
}

#[account]
#[derive(Default)]
pub struct Proposal {
    students_that_have_voted: Vec<i32>,          // Suponiendo 2.500 votos --> students + professors deben sumar 2500 id's ==> 2500 * 4 B (32 bits) = 10000 bytes = 10 KB
    professors_that_have_voted: Vec<i32>,
    id: i32,                                     
    title: String,
    content: String,
    creator_id: i32,
    creator_public_key: Pubkey,
    user_type: ProposalUserType,                  
    subject_id: i32,
    supporting_votes: u32,  
    against_votes: u32,
    expected_votes: u32,
    publishing_timestamp: i64,
    ending_timestamp: i64,
    updated_by_teacher: bool,
    high_rank_validation: bool,
    state: ProposalState,
    associated_professor_proposal_id: i32
}

#[account]
#[derive(Default)]
pub struct ProfessorProposal {
    id: i32,
    original_proposal_id: i32,
    name: String,
    publishing_timestamp: i64,
    ending_timestamp: i64,
    teaching_project_reference: String,
    state: ProfessorProposalState
}


// ------ Internal Performance of the Smart Contract ------ //


#[account]
#[derive(Default, PartialEq)]
pub struct CodeIdSubjectRelation {
    key_id: Vec<i32>,
    code_value: Vec<AdditionalSubjectInfo>
}

#[account]
#[derive(Default)]
pub struct SystemInitialization {
    system_is_initialized: bool
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq)]
pub struct AdditionalSubjectInfo {
    code: u32,
    number_of_professors: u8,
    number_of_students: u16
}

impl CodeIdSubjectRelation {

    fn add_new_code_value_without_corresponding_id (&mut self, code_value:u32, new_student: bool, new_professor: bool) {

        if let Some(_position) = self.code_value.iter().position(|&x| x.code == code_value) {
           return 
        } 

        self.key_id.push(-1_i32);

        let new_additional_subject_info = AdditionalSubjectInfo {
            code: code_value, 
            number_of_professors:new_professor as u8,
            number_of_students: new_student as u16
        };

        self.code_value.push(new_additional_subject_info);

    }

    fn add_key_value_subject_pair (&mut self, key_id:i32, code_value:u32, new_student: bool, new_professor: bool) {

        let mut code_already_exists: bool = false;
        let mut position_of_the_code: usize = MAX;

        if let Some(position) = self.code_value.iter().position(|&x| x.code == code_value) {
            code_already_exists = true;
            position_of_the_code = position;
        } 

        if code_already_exists {

            if self.key_id.get(position_of_the_code) == Some(&-1) && key_id >= 0 {

                self.key_id.swap_remove(position_of_the_code);
                self.key_id.insert(position_of_the_code, key_id);

            }  

        } else {

            self.key_id.push(key_id);

            let new_additional_subject_info = AdditionalSubjectInfo {
                code: code_value, 
                number_of_professors:new_professor as u8,
                number_of_students: new_student as u16
            };

            self.code_value.push(new_additional_subject_info);

        }

    }

    fn get_info_value_from_id_key (&mut self, key_id: i32) -> Option<AdditionalSubjectInfo> {
        
        if let Some(position) = self.key_id.iter().position(|&x| x == key_id) {
            if let Some(info) = self.code_value.get(position) {
                return Some(info.clone())
            } else {
                return None;
            }
        } else {
            return None;
        }  

    }

    fn get_id_key_from_code_value(&mut self, code_value: u32) -> Option<i32> {
        
        if let Some(position) = self.code_value.iter().position(|&x| x.code == code_value) {
            return self.key_id.get(position).cloned()
        } else {
            return None;
        }  

    }

    fn add_new_professor(&mut self, code_value:u32) {

        if let Some(position) = self.code_value.iter().position(|&x| x.code == code_value) {

            if let Some (info) = self.code_value.get_mut(position) {
                info.number_of_professors += 1;
            }
        }        
    }

    fn add_new_student (&mut self, code_value:u32) {

        if let Some(position) = self.code_value.iter().position(|&x| x.code == code_value) {

            if let Some (info) = self.code_value.get_mut(position) {
                info.number_of_students += 1;
            }
        }
    }

}


                                                          //---------------ENUMS--------------------//

#[derive(Default)]
#[derive(AnchorSerialize,AnchorDeserialize,Copy,Clone, PartialEq)] 
pub enum ProposalState {
#[default]
VotationInProgress,
WaitingForTeacher,
WaitingForHighRank,
Rejected,
Accepted,
AcceptedAndTokensGranted
}

impl fmt::Display for ProposalState {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ProposalState::Accepted => write!(f, "Accepted"),
            ProposalState::Rejected => write!(f, "Rejected"),
            ProposalState::WaitingForTeacher=> write!(f, "WaitingForTeacher"),
            ProposalState::WaitingForHighRank => write!(f, "WaitingForHighRank"),
            ProposalState::VotationInProgress=> write!(f, "VotationInProgress"),
            ProposalState::AcceptedAndTokensGranted=> write!(f, "AcceptedAndTokensGranted")
        }
    }
}

#[derive(Default)]
#[derive(AnchorSerialize,AnchorDeserialize,Copy,Clone)]
pub enum ProfessorProposalState { 
    #[default]
    Pending,
    Complete
}

#[derive(Default)]
#[derive(AnchorSerialize,AnchorDeserialize,Copy,Clone)]
pub enum ProposalUserType { 
    #[default]
    Student,
    Professor
}

#[derive(Default)]
#[derive(AnchorSerialize,AnchorDeserialize,Copy,Clone)]
pub enum SubjectCourse {
#[default]
NotDefined,
First,
Second,
Third,
Fourth,
Fifth,
Sixth,
Seventh,
Eighth,
Nineth
}


//----------------Errors-----------------//
#[error_code]
pub enum ErrorCode {

    #[msg("A HighRank must be initializated before creating a new professor or student")]
    NotAnyHighRankInitializated,

    #[msg("Incorrect professor's id submitted")]
    IncorrectProfessorId,

    #[msg("Incorrect student's id submitted")]
    IncorrectStudentId,

    #[msg("User has already voted on this proposal")]
    UserHasAlreadyVoted,

    #[msg("Votation is not open")]
    VotationIsNotOpen,

    #[msg("Votation is not waiting for Teacher")]
    VotationIsNotWaitingForTeacher,

    #[msg("Votation is not waiting for High Rank")]
    VotationIsNotWaitingForHighRank,

    #[msg("Votation is not Rejected")]
    VotationIsNotRejected,
    
    #[msg("Votation is not Accepted")]
    VotationIsNotAccepted,

    #[msg("User does not belong to the subject")]
    UserDoesNotBelongToTheSubject,

    #[msg("Additional subject's info not found")]
    AdditionalSubjectInfoNotFound,

    #[msg("System has not been initializated by a HighRank yet")]
    SystemIsNotInitializated,
    
    #[msg("Incorrect Teaching Project reference for IPFS")]
    IncorrectTeachingProjectReference
}


//----------------Events-----------------//

#[event]
pub struct NewProposalCreated {
    pub proposal_id: i32,
    pub subject_id: i32
}

#[event]
pub struct NewProfessorProposalCreated {
    pub proposal_id: i32,
    pub professor_proposal_id: i32
}
