use anchor_lang::prelude::*;
use std::mem::size_of;
use std::fmt;
use sha256::digest;

declare_id!("Hd3HLLMfbMJonaCvcQ8GugmTdKsGoHvce1JfAUU2gmiS");

#[program]
pub mod teaching_project_handler {

    use super::*;

    pub fn create_high_rank(ctx: Context<CreateHighRank>, user_type_code:String) -> Result<bool> {
        
        let high_rank_account = &mut *ctx.accounts.high_rank_account;
        high_rank_account.id = general_id_generator(&mut ctx.accounts.high_rank_id_handler);
        high_rank_account.identifier_code_hash = digest(user_type_code);
        high_rank_account.authority = *ctx.accounts.authority.key;

        Ok(true)
    }

    pub fn create_professor(ctx: Context<CreateProfessor>, user_type_code:String) -> Result<bool> {
        let professor_account = &mut *ctx.accounts.professor_account;
        professor_account.id = general_id_generator(&mut ctx.accounts.professor_id_handler);
        professor_account.identifier_code_hash = digest(user_type_code);
        professor_account.authority = *ctx.accounts.authority.key;
        Ok(true)
    }

    pub fn create_student(ctx: Context<CreateStudent>, user_type_code:String) -> Result<bool> {

        let student_account = &mut *ctx.accounts.student_account;
        student_account.id = general_id_generator(&mut ctx.accounts.student_id_handler);
        student_account.identifier_code_hash = digest(user_type_code);
        student_account.authority = *ctx.accounts.authority.key;
        
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

        Ok(false)
    }

    pub fn create_specialty (ctx: Context<CreateSpecialty>, name:String, degree_id: i32) -> Result<bool> {

        let specialty_account = &mut *ctx.accounts.specialty_account;
        specialty_account.id = general_id_generator(&mut ctx.accounts.specialty_id_handler);
        specialty_account.name = name;
        specialty_account.degree_id = degree_id;

        Ok(true)
    }

    pub fn create_subject(ctx: Context<CreateSubject>, name:String, degree_id: i32, specialty_id: i32, course: SubjectCourse, professors: Vec<i32>, students: Vec<i32>) -> Result<bool> {

        let subject_account = &mut *ctx.accounts.subject_account;
        subject_account.id = general_id_generator(&mut ctx.accounts.subject_id_handler);
        subject_account.name = name;
        subject_account.degree_id = degree_id;
        subject_account.specialty_id = specialty_id;
        subject_account.course = course;

        let professor_id_handler = &mut *ctx.accounts.professor_id_handler;

        for professor_id in &professors {
            if (professor_id.clone() >= professor_id_handler.smaller_id_available) || professor_id.clone() < 0 {
                return Err(error!(ErrorCode::IncorrectProfessorId));
            }
        }
        subject_account.professors = professors;

        let student_id_handler = &mut *ctx.accounts.student_id_handler;

        for student_id in &students {
            if (student_id.clone() >= student_id_handler.smaller_id_available) || student_id.clone() < 0 {
                return Err(error!(ErrorCode::IncorrectStudentId));
            }
        }
        subject_account.students = students;

        Ok(true)

    }

    pub fn create_proposal_by_student(ctx: Context<CreateProposalByStudent>, title:String, content:String) -> Result<bool> {

        let proposal_account = &mut *ctx.accounts.proposal_account;
        let subject_account = &mut *ctx.accounts.subject_account;
        let associated_professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;

        proposal_account.title = title;
        proposal_account.content = content;
        proposal_account.subject_id = subject_account.id;
        

        subject_account.pending_proposals.push(proposal_account.id);

        proposal_account.publishing_timestamp = Clock::get().unwrap().unix_timestamp;
        proposal_account.ending_timestamp = proposal_account.publishing_timestamp + 2592000 as i64;

        let creator_account = &mut *ctx.accounts.student_creator;
        proposal_account.creator_id = creator_account.id;

        proposal_account.id = general_id_generator(&mut ctx.accounts.proposal_id_handler);
        proposal_account.user_type = ProposalUserType::Student;

        proposal_account.high_rank_validation = false;
        proposal_account.updated_by_teacher = false;

        proposal_account.expected_votes = (subject_account.students.len() + subject_account.professors.len()) as u32 + 20;

        //Initializating associated professor_proposal_account for possible future uses
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
        let associated_professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;

        proposal_account.title = title;
        proposal_account.content = content;
        proposal_account.subject_id = subject_account.id;

        subject_account.pending_proposals.push(proposal_account.id);

        proposal_account.publishing_timestamp = Clock::get().unwrap().unix_timestamp;
        proposal_account.ending_timestamp = proposal_account.publishing_timestamp + 2592000;

        let creator_account = &mut *ctx.accounts.professor_creator;
        proposal_account.creator_id = creator_account.id;

        proposal_account.id = general_id_generator(&mut ctx.accounts.proposal_id_handler);
        proposal_account.user_type = ProposalUserType::Professor;

        proposal_account.high_rank_validation = false;
        proposal_account.updated_by_teacher = false;

        proposal_account.expected_votes = (subject_account.students.len() + subject_account.professors.len()) as u32 + 20;

        //Initializating associated professor_proposal_account for possible future uses
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
        let professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;

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
            if proposal_has_reached_maximum_participation(proposal_account.supporting_votes, proposal_account.against_votes) {
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
                let current_timestamp = Clock::get().unwrap().unix_timestamp;
                initialize_professor_proposal_account(professor_proposal_account, current_timestamp, current_timestamp + 1209600 as i64);
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
        let professor_account = &mut *ctx.accounts.voting_professor;
        let professor_proposal_account = &mut *ctx.accounts.professor_proposal_account;

        // Evaluating if student has already voted
        for professor_id in &(proposal_account.students_that_have_voted) {
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
          if proposal_has_reached_maximum_participation(proposal_account.supporting_votes, proposal_account.against_votes) {
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
              let current_timestamp = Clock::get().unwrap().unix_timestamp;
              initialize_professor_proposal_account(professor_proposal_account, current_timestamp, current_timestamp + 1209600 as i64);
              emit! (NewProfessorProposalCreated {proposal_id: proposal_account.id , professor_proposal_id: professor_proposal_account.id});
          } else {
              proposal_account.state = ProposalState::Rejected;
          }
      }

       // If votation is not open, error is returned due to the student could not make his/her vote  
       if !votation_is_open {return  Err(error!(ErrorCode::VotationIsNotOpen)) }; 

       Ok(proposal_account.state.to_string()) 

    }

    pub fn create_id_generator_for(ctx: Context<CreateIdHandler>, _specification: String) -> Result<bool> {
        let id_generator_account = &mut *ctx.accounts.specification_id_handler;
        id_generator_account.smaller_id_available = 0;
        Ok(true)
    }

}

                                                       // ------- AUX FUNCTIONS ------------- //

fn general_id_generator (id_handler_account: &mut Account<IdHandler>) ->  i32 {
    let id: i32 = id_handler_account.smaller_id_available;
    id_handler_account.smaller_id_available = id_handler_account.smaller_id_available + 1;
    return id;
}

fn votation_is_open (ending_timestamp_of_votation: i64) -> bool {
    if Clock::get().unwrap().unix_timestamp < ending_timestamp_of_votation {true} else {false}
}

fn proposal_has_reached_minimum_partitipation(supporting_votes: u32, against_votes: u32, expected_votes: u32) -> bool {
    return supporting_votes + against_votes >= expected_votes
}

fn proposal_has_reached_maximum_participation (supporting_votes: u32, against_votes: u32) -> bool {
   return (supporting_votes + against_votes) >= 21 as u32
}

fn proposal_has_reached_agreement(supporting_votes: u32, against_votes: u32) -> bool {
    let total_votes: f32 = supporting_votes as f32 + against_votes as f32;
    return (supporting_votes as f32) / (total_votes) as f32 >= (2_f32/3_f32 as f32) 
}

fn initialize_professor_proposal_account(professor_proposal_account: &mut ProfessorProposal, publishing_timestamp: i64, ending_timestamp: i64) {
   professor_proposal_account.publishing_timestamp = publishing_timestamp;
   professor_proposal_account.ending_timestamp = ending_timestamp;
   professor_proposal_account.state = ProfessorProposalState::Pending;
}


                          // --------- ACCOUNTS DATA STRUCTURES ('CONTEXT' PARAM IN  'teaching_project_handler' MOD FUNCTIONS) ----- 

#[derive(Accounts)]
#[instruction(_specification: String)]
pub struct CreateIdHandler<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [(_specification.clone() + "IdHandler").as_bytes().as_ref()],
        bump
    )]
    pub specification_id_handler: Account<'info,IdHandler>,

    pub system_program: Program<'info,System>
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
        constraint = digest(user_type_code) == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c")
    ]
    pub high_rank_account: Account<'info, HighRank>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (user_type_code: String)]
pub struct CreateProfessor<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"professorIdHandler"],
        bump
    )]
    pub professor_id_handler: Account<'info,IdHandler>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Professor>() + 12 + 60 + 100 + 100, 
        seeds=[b"professor", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code) == "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9")
    ]
    pub professor_account: Account<'info, Professor>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction (user_type_code: String)]
pub struct CreateStudent<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"studentIdHandler"],
        bump
    )]
    pub student_id_handler: Account<'info,IdHandler>,


    #[account(init, 
        payer=authority, 
        space = size_of::<Student>() + 12 + 100 + 100, 
        seeds=[b"student", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code) == "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69")
    ]
    pub student_account: Account<'info, Student>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (name: String)]
pub struct CreateFaculty<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

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
        constraint = name.len() <= 500
    )]
    pub faculty_account: Account<'info, Faculty>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (name: String, faculty_id:i32)]
pub struct CreateDegree<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

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
        constraint = (faculty_id >= 0 && faculty_id < faculty_id_handler.smaller_id_available)
    )]
    pub degree_account: Account<'info, Degree>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (name: String, degree_id:i32)]
pub struct CreateSpecialty <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

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
        constraint = (degree_id >= 0 && degree_id < degree_id_handler.smaller_id_available)
    )]
    pub specialty_account: Account<'info, Specialty>,

    pub system_program: Program<'info,System>
}


#[derive(Accounts)]
#[instruction (name: String, degree_id: i32, specialty_id: i32, course: SubjectCourse)]
pub struct CreateSubject<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, has_one = authority)]      // Se comprueba que la cuenta de "Alto cargo" pasada pertenece a quien firma la transacción (autenticación)
    pub high_rank: Account<'info, HighRank>,

    #[account(mut)]
    pub subject_id_handler: Account<'info,IdHandler>,

    #[account()]
    pub degree_id_handler: Account<'info,IdHandler>,

    #[account()]
    pub specialty_id_handler: Account<'info,IdHandler>,

    #[account()]
    pub professor_id_handler: Account<'info, IdHandler>,

    #[account()]
    pub student_id_handler: Account<'info, IdHandler>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Subject>() + name.as_bytes().len(), 
        seeds=[b"subject", subject_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = (degree_id >= 0) && (degree_id < degree_id_handler.smaller_id_available),
        constraint = (specialty_id == -1) || (specialty_id >= 0 && specialty_id < specialty_id_handler.smaller_id_available)
    )]
    pub subject_account: Account<'info, Subject>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction (title: String, content: String)]
pub struct CreateProposalByStudent <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, has_one = authority)]      
    pub student_creator: Account<'info, Student>,

    #[account(mut)]
    pub proposal_id_handler: Account<'info,IdHandler>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"professorProposalIdHandler"],
        bump
    )]
    pub professor_proposal_id_handler: Account<'info, IdHandler>,
    
    #[account()]
    pub subject_id_handler: Account<'info,IdHandler>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Proposal>() + title.as_bytes().len() + content.as_bytes().len() + 40, 
        seeds=[b"proposal", proposal_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = student_creator.identifier_code_hash == "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69",
        constraint = title.len() <= 100 && content.len() <= 2500
        
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(init,
        payer = authority,
        space = size_of::<ProfessorProposal>() + title.len() + 20,
        seeds = [b"professorProposal", professor_proposal_id_handler.smaller_id_available.to_le_bytes().as_ref()],
        bump,
)]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,

    #[account(
        seeds = [b"subject", proposal_account.subject_id.to_le_bytes().as_ref()],
        bump,
        constraint = proposal_account.subject_id > 0 || proposal_account.subject_id < subject_id_handler.smaller_id_available
    )]
    pub subject_account: Account<'info, Subject>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction (title: String, content: String)]
pub struct CreateProposalByProfessor <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, has_one = authority)]      
    pub professor_creator: Account<'info, Professor>,

    #[account(mut)]
    pub proposal_id_handler: Account<'info,IdHandler>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"professorProposalIdHandler"],
        bump
    )]
    pub professor_proposal_id_handler: Account<'info, IdHandler>,
    
    #[account()]
    pub subject_id_handler: Account<'info,IdHandler>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Proposal>() + title.as_bytes().len() + content.as_bytes().len() + 40, 
        seeds=[b"proposal", proposal_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = professor_creator.identifier_code_hash == "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9",
        constraint = title.len() <= 100 && content.len() <= 2500
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(init,
              payer = authority,
              space = size_of::<ProfessorProposal>() + title.len() + 20,
              seeds = [b"professorProposal", professor_proposal_id_handler.smaller_id_available.to_le_bytes().as_ref()],
              bump,
    )]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,


    #[account(
        seeds = [b"subject", proposal_account.subject_id.to_le_bytes().as_ref()],
        bump,
        constraint = proposal_account.subject_id > 0 || proposal_account.subject_id <= subject_id_handler.smaller_id_available
    )]
    pub subject_account: Account<'info, Subject>,

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
        seeds=[b"proposal", proposal_account.id.to_le_bytes().as_ref()], 
        bump,
        constraint = voting_student.identifier_code_hash == "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69",
        constraint = ProposalState::VotationInProgress == proposal_account.state                                               // check if Votation is in Progress (PartialEq must be implemented by ProposalState to use '==' )
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
        seeds = [b"professorProposal", professor_proposal_account.id.to_le_bytes().as_ref()],
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
        seeds=[b"proposal", proposal_account.id.to_le_bytes().as_ref()], 
        bump,
        constraint = voting_professor.identifier_code_hash == "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9",
        constraint = ProposalState::VotationInProgress == proposal_account.state                                               
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
        seeds = [b"professorProposal", professor_proposal_account.id.to_le_bytes().as_ref()],
        bump,
        constraint = professor_proposal_account.original_proposal_id == proposal_account.id,
        constraint = professor_proposal_account.id < professor_proposal_id_handler.smaller_id_available
    )]
    pub professor_proposal_account: Account<'info, ProfessorProposal>,

    pub system_program: Program<'info, System>
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
    subjects: Vec<u64>,                           // Suponiendo 10 asignaturas: 10*8 bytes (80 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 60 bytes
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
    subjects: Vec<u64>,                    // Suponiendo 15 asignaturas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
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
degree_id: i32,
specialty_id: i32,
course: SubjectCourse,
students: Vec<i32>,
professors: Vec<i32>,
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
    state: ProfessorProposalState
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
Accepted
}

impl fmt::Display for ProposalState {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ProposalState::Accepted => write!(f, "Accepted"),
            ProposalState::Rejected => write!(f, "Rejected"),
            ProposalState::WaitingForTeacher=> write!(f, "WaitingForTeacher"),
            ProposalState::WaitingForHighRank => write!(f, "WaitingForHighRank"),
            ProposalState::VotationInProgress=> write!(f, "VotationInProgress")
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
    #[msg("Incorrect professor's id submitted")]
    IncorrectProfessorId,

    #[msg("Incorrect student's id submitted")]
    IncorrectStudentId,

    #[msg("User has already voted on this proposal")]
    UserHasAlreadyVoted,

    #[msg("Votation is not open")]
    VotationIsNotOpen
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
