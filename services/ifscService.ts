
export interface IFSCDetails {
  BANK: string;
  BRANCH: string;
  IFSC: string;
  ADDRESS: string;
  CITY: string;
  STATE: string;
}

export const ifscService = {
  async fetchDetails(ifsc: string): Promise<IFSCDetails | null> {
    if (!ifsc || ifsc.length !== 11) return null;
    
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('IFSC service unavailable');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching IFSC details:', error);
      return null;
    }
  }
};