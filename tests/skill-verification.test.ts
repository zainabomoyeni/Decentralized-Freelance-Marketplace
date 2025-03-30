import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract interactions
const mockContractState = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  freelancerSkills: new Map(),
  skillEndorsements: new Map(),
}

// Mock contract functions
const mockContract = {
  verifySkill: (freelancer, skill) => {
    if (mockContractState.admin !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
      return { error: 100 }
    }
    
    const key = `${freelancer}-${skill}`
    mockContractState.freelancerSkills.set(key, {
      verified: true,
      timestamp: 123456,
      verifier: mockContractState.admin,
    })
    
    return { success: true }
  },
  
  endorseSkill: (freelancer, skill, rating, comment) => {
    if (rating > 5) {
      return { error: 101 }
    }
    
    const key = `${freelancer}-${skill}`
    if (!mockContractState.freelancerSkills.has(key)) {
      return { error: 102 }
    }
    
    const endorsementKey = `${freelancer}-${skill}-ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM`
    mockContractState.skillEndorsements.set(endorsementKey, {
      rating,
      comment,
      timestamp: 123456,
    })
    
    return { success: true }
  },
  
  isSkillVerified: (freelancer, skill) => {
    const key = `${freelancer}-${skill}`
    const skillData = mockContractState.freelancerSkills.get(key)
    return skillData ? skillData.verified : false
  },
  
  getSkillVerification: (freelancer, skill) => {
    const key = `${freelancer}-${skill}`
    return mockContractState.freelancerSkills.get(key)
  },
  
  getSkillEndorsement: (freelancer, skill, endorser) => {
    const key = `${freelancer}-${skill}-${endorser}`
    return mockContractState.skillEndorsements.get(key)
  },
}

describe("Skill Verification Contract", () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockContractState.freelancerSkills.clear()
    mockContractState.skillEndorsements.clear()
    mockContractState.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  })
  
  it("should verify a skill successfully", () => {
    const freelancer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const skill = "javascript"
    
    const result = mockContract.verifySkill(freelancer, skill)
    expect(result.success).toBe(true)
    
    const isVerified = mockContract.isSkillVerified(freelancer, skill)
    expect(isVerified).toBe(true)
  })
  
  it("should fail to verify a skill if not admin", () => {
    mockContractState.admin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    
    const freelancer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const skill = "javascript"
    
    const result = mockContract.verifySkill(freelancer, skill)
    expect(result.error).toBe(100)
  })
  
  it("should endorse a skill successfully", () => {
    const freelancer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const skill = "javascript"
    const rating = 5
    const comment = "Great JavaScript skills!"
    
    // First verify the skill
    mockContract.verifySkill(freelancer, skill)
    
    // Then endorse it
    const result = mockContract.endorseSkill(freelancer, skill, rating, comment)
    expect(result.success).toBe(true)
    
    // Check the endorsement
    const endorsement = mockContract.getSkillEndorsement(freelancer, skill, "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    
    expect(endorsement).toBeDefined()
    expect(endorsement.rating).toBe(rating)
    expect(endorsement.comment).toBe(comment)
  })
  
  it("should fail to endorse a skill with invalid rating", () => {
    const freelancer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const skill = "javascript"
    
    // First verify the skill
    mockContract.verifySkill(freelancer, skill)
    
    // Try to endorse with invalid rating
    const result = mockContract.endorseSkill(freelancer, skill, 6, "Invalid rating")
    expect(result.error).toBe(101)
  })
  
  it("should fail to endorse a non-verified skill", () => {
    const freelancer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const skill = "python"
    
    // Try to endorse without verification
    const result = mockContract.endorseSkill(freelancer, skill, 5, "Should fail")
    expect(result.error).toBe(102)
  })
})

